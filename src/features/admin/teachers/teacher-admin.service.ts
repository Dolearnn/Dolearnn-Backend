import bcrypt from 'bcryptjs';
import { AccountStatus, AuthProvider, Role, type TeacherProfile, type User } from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import type {
  CreateTeacherInput,
  TerminateTeacherInput,
  UpdateTeacherRateInput,
} from './teacher-admin.schemas';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function displayTeacher(teacher: TeacherProfile & { user: User }) {
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
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
}

export async function listTeachers() {
  const teachers = await prisma.teacherProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  return teachers.map(displayTeacher);
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
) {
  const teacher = await prisma.teacherProfile.update({
    where: { id: teacherId },
    data: {
      hourlyRate: input.hourlyRate,
    },
    include: { user: true },
  });

  return displayTeacher(teacher);
}

export async function terminateTeacher(
  teacherId: string,
  input: TerminateTeacherInput,
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

    return tx.teacherProfile.update({
      where: { id: teacherId },
      data: {
        status: AccountStatus.TERMINATED,
        terminationReason: input.reason.trim(),
        terminatedAt,
      },
      include: { user: true },
    });
  });

  return displayTeacher(teacher);
}
