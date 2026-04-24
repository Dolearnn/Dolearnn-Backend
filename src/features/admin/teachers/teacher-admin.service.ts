import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  AuthProvider,
  AuditAction,
  AuditEntityType,
  Prisma,
  Role,
  SessionStatus,
  type TeacherProfile,
  type User,
} from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import { createAuditLog, type AuditActor } from '../../audit/audit.service';
import type {
  CreateTeacherInput,
  ListTeachersQueryInput,
  TerminateTeacherInput,
  UpdateTeacherRateInput,
} from './teacher-admin.schemas';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function displayTeacher(
  teacher: TeacherProfile & { user: User },
  counts?: { studentCount?: number; upcomingCount?: number },
) {
  return {
    id: teacher.id,
    userId: teacher.userId,
    name: teacher.user.name,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.user.email,
    phoneCountry: teacher.phoneCountry,
    phoneNumber: teacher.phoneNumber,
    gender: teacher.gender,
    bio: teacher.bio,
    subjects: teacher.subjects,
    qualifications: teacher.qualifications,
    bankName: teacher.bankName,
    accountName: teacher.accountName,
    accountNumber: teacher.accountNumber,
    hourlyRate: teacher.hourlyRate,
    rating: teacher.rating,
    totalSessions: teacher.totalSessions,
    status: teacher.status,
    terminationReason: teacher.terminationReason,
    terminatedAt: teacher.terminatedAt,
    joinedAt: teacher.joinedAt,
    studentCount: counts?.studentCount ?? 0,
    upcomingCount: counts?.upcomingCount ?? 0,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
}

export async function listTeachers() {
  return listTeachersPage({ page: 1, pageSize: 100 });
}

export async function listTeachersPage(input: ListTeachersQueryInput) {
  const search = input.search?.trim();
  const where: Prisma.TeacherProfileWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { subjects: { has: search } },
          ],
        }
      : {}),
  };

  const skip = (input.page - 1) * input.pageSize;
  const [teachers, total, grouped, studentAssignments, upcomingSessions] =
    await Promise.all([
      prisma.teacherProfile.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: input.pageSize,
      }),
      prisma.teacherProfile.count({ where }),
      prisma.teacherProfile.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.student.groupBy({
        by: ['assignedTeacherId'],
        where: {
          assignedTeacherId: {
            in: (
              await prisma.teacherProfile.findMany({
                where,
                select: { id: true },
              })
            ).map((teacher) => teacher.id),
          },
        },
        _count: { _all: true },
      }),
      prisma.session.groupBy({
        by: ['teacherId'],
        where: {
          teacherId: {
            in: (
              await prisma.teacherProfile.findMany({
                where,
                select: { id: true },
              })
            ).map((teacher) => teacher.id),
          },
          status: SessionStatus.UPCOMING,
        },
        _count: { _all: true },
      }),
    ]);

  const statusCounts = grouped.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});
  const studentCountMap = new Map(
    studentAssignments.map((row) => [row.assignedTeacherId ?? '', row._count._all]),
  );
  const upcomingCountMap = new Map(
    upcomingSessions.map((row) => [row.teacherId, row._count._all]),
  );

  return {
    teachers: teachers.map((teacher) =>
      displayTeacher(teacher, {
        studentCount: studentCountMap.get(teacher.id) ?? 0,
        upcomingCount: upcomingCountMap.get(teacher.id) ?? 0,
      }),
    ),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    summary: {
      total: (statusCounts.ACTIVE ?? 0) + (statusCounts.TERMINATED ?? 0),
      active: statusCounts.ACTIVE ?? 0,
      terminated: statusCounts.TERMINATED ?? 0,
    },
  };
}

export async function createTeacher(input: CreateTeacherInput) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'An account already exists for this email');
  }

  const passwordHash = await bcrypt.hash(input.defaultPassword, 12);
  const name = `${input.firstName.trim()} ${input.lastName.trim()}`;

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      mustChangePassword: true,
      role: Role.TEACHER,
      authProvider: AuthProvider.EMAIL,
      teacherProfile: {
        create: {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phoneCountry: input.phoneCountry?.trim() || null,
          phoneNumber: input.phoneNumber?.trim() || null,
          gender: input.gender,
          bio: input.bio?.trim() || null,
          subjects: input.subjects.map((subject) => subject.trim()),
          qualifications: input.qualifications.map((qualification) =>
            qualification.trim(),
          ),
          hourlyRate: input.hourlyRate,
        },
      },
    },
    include: {
      teacherProfile: {
        include: { user: true },
      },
    },
  });

  if (!user.teacherProfile) {
    throw new AppError(500, 'Teacher profile could not be created');
  }

  return displayTeacher(user.teacherProfile);
}

export async function updateTeacherRate(
  teacherId: string,
  input: UpdateTeacherRateInput,
  actor: AuditActor,
) {
  const existing = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: { user: true },
  });

  if (!existing) {
    throw new AppError(404, 'Teacher not found');
  }

  const teacher = await prisma.$transaction(async (tx) => {
    const updatedTeacher = await tx.teacherProfile.update({
      where: { id: teacherId },
      data: {
        hourlyRate: input.hourlyRate,
      },
      include: { user: true },
    });

    await createAuditLog(
      {
        actor,
        action: AuditAction.TEACHER_RATE_UPDATED,
        entityType: AuditEntityType.TEACHER,
        entityId: updatedTeacher.id,
        summary: `${actor.email ?? 'Admin'} updated ${updatedTeacher.user.name}'s hourly rate.`,
        teacherId: updatedTeacher.id,
        metadata: {
          previousHourlyRate: Number(existing.hourlyRate),
          nextHourlyRate: Number(updatedTeacher.hourlyRate),
        },
      },
      tx,
    );

    return updatedTeacher;
  });

  return displayTeacher(teacher);
}

export async function terminateTeacher(
  teacherId: string,
  input: TerminateTeacherInput,
  actor: AuditActor,
) {
  const existing = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: { user: true },
  });

  if (!existing) {
    throw new AppError(404, 'Teacher not found');
  }

  const terminatedAt = new Date();
  const teacher = await prisma.$transaction(async (tx) => {
    await tx.student.updateMany({
      where: { assignedTeacherId: teacherId },
      data: { assignedTeacherId: null },
    });

    await tx.studentSubjectAssignment.deleteMany({
      where: { teacherId },
    });

    await tx.user.update({
      where: { id: existing.userId },
      data: { status: AccountStatus.TERMINATED },
    });

    const teacher = await tx.teacherProfile.update({
      where: { id: teacherId },
      data: {
        status: AccountStatus.TERMINATED,
        terminationReason: input.reason.trim(),
        terminatedAt,
      },
      include: { user: true },
    });

    await createAuditLog(
      {
        actor,
        action: AuditAction.TEACHER_TERMINATED,
        entityType: AuditEntityType.TEACHER,
        entityId: teacher.id,
        summary: `${actor.email ?? 'Admin'} terminated ${teacher.user.name}.`,
        teacherId: teacher.id,
        metadata: {
          reason: input.reason.trim(),
          terminatedAt: terminatedAt.toISOString(),
        },
      },
      tx,
    );

    return teacher;
  });

  return displayTeacher(teacher);
}
