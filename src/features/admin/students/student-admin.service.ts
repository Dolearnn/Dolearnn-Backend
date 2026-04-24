import {
  AccountStatus,
  AuditAction,
  AuditEntityType,
  GenderPreference,
  Prisma,
  Role,
} from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import { createAuditLog, type AuditActor } from '../../audit/audit.service';
import { createNotifications } from '../../notifications/notification.service';
import type { AssignTeacherInput } from './student-admin.schemas';
import type { CreateAdminStudentInput } from './student-admin.schemas';
import type { ListStudentsQueryInput } from './student-admin.schemas';

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

function subjectList(student: Awaited<ReturnType<typeof fetchStudents>>[number]) {
  const intake = student.intake;
  if (!intake) return [];

  const subjects =
    intake.subjects.length > 0
      ? intake.subjects.map((subject) =>
          subject === 'Other' && intake.subjectOther?.trim()
            ? intake.subjectOther.trim()
            : subject,
        )
      : [
          intake.subject === 'Other' && intake.subjectOther?.trim()
            ? intake.subjectOther.trim()
            : intake.subject,
        ];

  return Array.from(
    new Set(subjects.map((subject) => subject.trim()).filter(Boolean)),
  );
}

function isFullyMatched(student: Awaited<ReturnType<typeof fetchStudents>>[number]) {
  const subjects = subjectList(student);
  if (subjects.length === 0) return false;

  return subjects.every((subject) =>
    student.subjectAssignments.some(
      (assignment) => assignment.subject.toLowerCase() === subject.toLowerCase(),
    ),
  );
}

async function fetchStudents(where: Prisma.StudentWhereInput) {
  return prisma.student.findMany({
    where,
    include: studentInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function listStudents(input: ListStudentsQueryInput) {
  const search = input.search?.trim();
  const where = {
    ...(input.hasIntake === undefined
      ? {}
      : {
          intake: input.hasIntake ? { isNot: null } : { is: null },
        }),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { school: { contains: search, mode: 'insensitive' as const } },
            {
              intake: {
                is: {
                  OR: [
                    { subject: { contains: search, mode: 'insensitive' as const } },
                    {
                      subjectOther: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                    { subjects: { has: search } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const students = await fetchStudents(where);
  const decoratedStudents = students.map((student) => ({
    student,
    fullyMatched: isFullyMatched(student),
  }));

  const assignmentFiltered = decoratedStudents.filter(({ fullyMatched }) => {
    if (input.assignmentStatus === 'PENDING') return !fullyMatched;
    if (input.assignmentStatus === 'MATCHED') return fullyMatched;
    return true;
  });

  const total = assignmentFiltered.length;
  const start = (input.page - 1) * input.pageSize;
  const end = start + input.pageSize;
  const pagedStudents = assignmentFiltered.slice(start, end).map(({ student }) => student);

  return {
    students: pagedStudents,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    summary: {
      total: decoratedStudents.length,
      pending: decoratedStudents.filter(({ fullyMatched }) => !fullyMatched).length,
      matched: decoratedStudents.filter(({ fullyMatched }) => fullyMatched).length,
    },
  };
}

export async function createAdminStudent(
  input: CreateAdminStudentInput,
  actor: AuditActor,
) {
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
        intake: input.intake
          ? {
              create: {
                subject: input.intake.subject.trim(),
                subjects: input.intake.subjects.map((subject) => subject.trim()),
                subjectOther: input.intake.subjectOther?.trim() || null,
                learningGoal: input.intake.learningGoal,
                currentLevel: input.intake.currentLevel,
                specificTopics: input.intake.specificTopics?.trim() || null,
                teacherGenderPref: input.intake.teacherGenderPref,
                specialNotes: input.intake.specialNotes?.trim() || null,
                timezone: input.intake.timezone,
                sessionsPerWeek: input.intake.sessionsPerWeek,
                budget: input.intake.budget,
                schedule: {
                  create: input.intake.schedule,
                },
              },
            }
          : undefined,
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

    await createAuditLog(
      {
        actor,
        action: AuditAction.STUDENT_CREATED,
        entityType: AuditEntityType.STUDENT,
        entityId: student.id,
        summary: `${actor.email ?? 'Admin'} created student ${student.fullName}.`,
        studentId: student.id,
        metadata: {
          parentId: parent.id,
          fullName: student.fullName,
          grade: student.grade,
        },
      },
      tx,
    );

    return student;
  });
}

export async function listPendingIntakes() {
  const result = await listStudents({
    page: 1,
    pageSize: 100,
    hasIntake: true,
    assignmentStatus: 'PENDING',
  });
  return result.students;
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
