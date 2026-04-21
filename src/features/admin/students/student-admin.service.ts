import { AccountStatus, GenderPreference, Role } from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import { createNotifications } from '../../notifications/notification.service';
import type { AssignTeacherInput } from './student-admin.schemas';
import type { CreateAdminStudentInput } from './student-admin.schemas';

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

export async function createAdminStudent(input: CreateAdminStudentInput) {
  const parent = await prisma.parentProfile.findUnique({
    where: { id: input.parentId },
    include: { user: true },
  });

  if (!parent) {
    throw new AppError(404, 'Parent not found');
  }

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        parentId: parent.id,
        fullName: input.fullName.trim(),
        age: input.age,
        grade: input.grade,
        gradeOther: input.gradeOther?.trim() || null,
        school: input.school?.trim() || null,
      },
      include: studentInclude,
    });

    await createNotifications(
      [
        {
          userId: parent.userId,
          role: Role.PARENT,
          title: 'Student profile created',
          body: `Admin created ${student.fullName}'s profile. You can now complete or update the intake details.`,
          studentId: student.id,
        },
      ],
      tx,
    );

    return student;
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

  const preferredGender = student.intake?.teacherGenderPref;
  if (
    preferredGender &&
    preferredGender !== GenderPreference.NO_PREFERENCE &&
    teacher.gender !== null &&
    teacher.gender !== undefined &&
    String(teacher.gender) !== String(preferredGender)
  ) {
    const prefLabel =
      preferredGender === GenderPreference.MALE ? 'male' : 'female';
    throw new AppError(
      400,
      `${student.fullName}'s family asked for a ${prefLabel} teacher. ${teacher.user.name} does not match this preference.`,
    );
  }

  if (
    preferredGender &&
    preferredGender !== GenderPreference.NO_PREFERENCE &&
    !teacher.gender
  ) {
    throw new AppError(
      400,
      `${teacher.user.name} has not set their gender, which is needed to honor the family's teacher gender preference.`,
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
          meetLink: input.meetLink?.trim() || null,
        },
        update: {
          teacherId: teacher.id,
          ...(input.meetLink ? { meetLink: input.meetLink.trim() } : {}),
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
