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
  subjectAssignments: {
    include: {
      teacher: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
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
        intake: true,
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

  const subject = input.subject?.trim();
  const subjectsToAssign = subject
    ? [subject]
    : student.intake?.subjects?.length
      ? student.intake.subjects
      : student.intake?.subject
        ? [student.intake.subject]
        : [];

  if (subjectsToAssign.length === 0) {
    throw new AppError(400, 'Student has no subject to assign');
  }

  const unsupportedSubjects = subjectsToAssign.filter(
    (item) =>
      !teacher.subjects.some((teacherSubject) => {
        const a = teacherSubject.toLowerCase();
        const b = item.toLowerCase();
        return a.includes(b) || b.includes(a);
      }),
  );

  if (unsupportedSubjects.length > 0) {
    throw new AppError(
      400,
      `${teacher.user.name} does not cover ${unsupportedSubjects.join(', ')}`,
    );
  }

  return prisma.$transaction(async (tx) => {
    for (const assignmentSubject of subjectsToAssign) {
      await tx.studentSubjectAssignment.upsert({
        where: {
          studentId_subject: {
            studentId,
            subject: assignmentSubject,
          },
        },
        create: {
          studentId,
          teacherId: teacher.id,
          subject: assignmentSubject,
        },
        update: {
          teacherId: teacher.id,
        },
      });
    }

    const assignmentCount = await tx.studentSubjectAssignment.count({
      where: { studentId },
    });

    const updatedStudent = await tx.student.update({
      where: { id: studentId },
      data: {
        assignedTeacherId:
          assignmentCount === 0 || !student.assignedTeacherId
            ? teacher.id
            : student.assignedTeacherId,
      },
      include: studentInclude,
    });

    const subjectText =
      subjectsToAssign.length === 1
        ? subjectsToAssign[0]
        : subjectsToAssign.join(', ');

    await createNotifications(
      [
        {
          userId: student.parent.userId,
          role: Role.PARENT,
          title: 'Teacher assigned',
          body: `${teacher.user.name} has been assigned to ${student.fullName} for ${subjectText}.`,
          studentId: student.id,
          teacherId: teacher.id,
        },
        {
          userId: teacher.userId,
          role: Role.TEACHER,
          title: 'New student assigned',
          body: `You have been assigned to ${student.fullName} for ${subjectText}.`,
          studentId: student.id,
          teacherId: teacher.id,
        },
      ],
      tx,
    );

    return updatedStudent;
  });
}

export async function unassignTeacherFromStudent(
  studentId: string,
  subject?: string,
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parent: { include: { user: true } },
      assignedTeacher: { include: { user: true } },
      subjectAssignments: {
        include: {
          teacher: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  return prisma.$transaction(async (tx) => {
    const trimmedSubject = subject?.trim();
    const removedAssignments = trimmedSubject
      ? student.subjectAssignments.filter(
          (assignment) =>
            assignment.subject.toLowerCase() === trimmedSubject.toLowerCase(),
        )
      : student.subjectAssignments;

    if (trimmedSubject) {
      await tx.studentSubjectAssignment.deleteMany({
        where: {
          studentId,
          subject: trimmedSubject,
        },
      });
    } else {
      await tx.studentSubjectAssignment.deleteMany({
        where: { studentId },
      });
    }

    const remainingAssignment = await tx.studentSubjectAssignment.findFirst({
      where: { studentId },
    });

    const updatedStudent = await tx.student.update({
      where: { id: studentId },
      data: {
        assignedTeacherId: remainingAssignment?.teacherId ?? null,
      },
      include: studentInclude,
    });

    const subjectText = trimmedSubject ? ` for ${trimmedSubject}` : '';
    const teacherNotifications = removedAssignments.map((assignment) => ({
      userId: assignment.teacher.userId,
      role: Role.TEACHER,
      title: 'Student removed',
      body: `${student.fullName} has been removed from your student list${subjectText}.`,
      studentId: student.id,
      teacherId: assignment.teacherId,
    }));

    await createNotifications(
      [
        {
          userId: student.parent.userId,
          role: Role.PARENT,
          title: 'Teacher removed',
          body: `${student.fullName} no longer has an assigned teacher${subjectText}.`,
          studentId: student.id,
          teacherId: student.assignedTeacherId,
        },
        ...teacherNotifications,
      ],
      tx,
    );

    return updatedStudent;
  });
}
