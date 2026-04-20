import { AccountStatus, Role } from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import { createNotifications } from '../../notifications/notification.service';
import type { AssignTeacherInput } from './student-admin.schemas';

const studentInclude = {
  parent: {
    include: {
      user: true,
    },
  },
  intake: {
    include: {
      schedule: {
        orderBy: { day: 'asc' as const },
      },
    },
  },
  assignedTeacher: {
    include: {
      user: true,
    },
  },
};

export async function listStudents() {
  return prisma.student.findMany({
    include: studentInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function listPendingIntakes() {
  return prisma.student.findMany({
    where: {
      assignedTeacherId: null,
      intake: {
        isNot: null,
      },
    },
    include: studentInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function assignTeacherToStudent(
  studentId: string,
  input: AssignTeacherInput,
) {
  const [student, teacher] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parent: { include: { user: true } },
      },
    }),
    prisma.teacherProfile.findUnique({
      where: { id: input.teacherId },
      include: { user: true },
    }),
  ]);

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  if (!teacher) {
    throw new AppError(404, 'Teacher not found');
  }

  if (
    teacher.status !== AccountStatus.ACTIVE ||
    teacher.user.status !== AccountStatus.ACTIVE
  ) {
    throw new AppError(400, 'Only active teachers can be assigned');
  }

  return prisma.$transaction(async (tx) => {
    const updatedStudent = await tx.student.update({
      where: { id: studentId },
      data: {
        assignedTeacherId: teacher.id,
      },
      include: studentInclude,
    });

    await createNotifications(
      [
        {
          userId: student.parent.userId,
          role: Role.PARENT,
          title: 'Teacher assigned',
          body: `${teacher.user.name} has been assigned to ${student.fullName}.`,
          studentId: student.id,
          teacherId: teacher.id,
        },
        {
          userId: teacher.userId,
          role: Role.TEACHER,
          title: 'New student assigned',
          body: `You have been assigned to ${student.fullName}.`,
          studentId: student.id,
          teacherId: teacher.id,
        },
      ],
      tx,
    );

    return updatedStudent;
  });
}

export async function unassignTeacherFromStudent(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parent: { include: { user: true } },
      assignedTeacher: { include: { user: true } },
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  return prisma.$transaction(async (tx) => {
    const updatedStudent = await tx.student.update({
      where: { id: studentId },
      data: {
        assignedTeacherId: null,
      },
      include: studentInclude,
    });

    await createNotifications(
      [
        {
          userId: student.parent.userId,
          role: Role.PARENT,
          title: 'Teacher removed',
          body: `${student.fullName} no longer has an assigned teacher.`,
          studentId: student.id,
          teacherId: student.assignedTeacherId,
        },
        ...(student.assignedTeacher
          ? [
              {
                userId: student.assignedTeacher.userId,
                role: Role.TEACHER,
                title: 'Student removed',
                body: `${student.fullName} has been removed from your student list.`,
                studentId: student.id,
                teacherId: student.assignedTeacher.id,
              },
            ]
          : []),
      ],
      tx,
    );

    return updatedStudent;
  });
}
