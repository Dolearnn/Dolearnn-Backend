require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apiBase = process.env.SMOKE_API_URL || `http://localhost:${process.env.PORT || 4000}/api`;
const adminEmail = process.env.SMOKE_ADMIN_EMAIL;
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
const stamp = Date.now();
const familyEmail = `smoke-family-${stamp}@example.com`;
const teacherEmail = `smoke-teacher-${stamp}@example.com`;
const teacherDefaultPassword = 'SmokeTeach123#';
const teacherNewPassword = 'SmokeTeach456#';

function assertSmokeConfig() {
  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD before running this script.',
    );
  }
}

function nextMondayEveningIso() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysUntilMonday = ((1 - utcDay + 7) % 7) || 7;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      18,
      0,
      0,
    ),
  ).toISOString();
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      body && body.message ? body.message : text || response.statusText;
    throw new Error(`${options.label || path} failed: ${response.status} ${message}`);
  }

  return body;
}

async function cleanup() {
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { title: { contains: 'Smoke' } },
        { body: { contains: 'Smoke' } },
        { title: { contains: 'smoke' } },
        { body: { contains: 'smoke' } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [familyEmail, teacherEmail] } },
  });
}

async function main() {
  assertSmokeConfig();
  await request('/health', { label: 'health' });

  const admin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    label: 'admin login',
  });
  console.log('OK admin login');

  const teacher = await request('/admin/teachers', {
    method: 'POST',
    token: admin.token,
    body: JSON.stringify({
      firstName: 'Smoke',
      lastName: 'Teacher',
      email: teacherEmail,
      phoneCountry: '+234',
      phoneNumber: '8000000000',
      bio: 'Temporary smoke test teacher',
      subjects: ['Maths'],
      qualifications: ['Smoke test qualification'],
      hourlyRate: 20,
      defaultPassword: teacherDefaultPassword,
    }),
    label: 'admin create teacher',
  });
  console.log('OK admin creates teacher');

  const family = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Smoke Family',
      email: familyEmail,
      password: 'SmokeFamily123#',
      whatsapp: '+234 800 000 0000',
    }),
    label: 'family register',
  });

  const parent = await prisma.parentProfile.findUnique({
    where: { userId: family.user.id },
  });
  if (!parent) {
    throw new Error('Expected registered family to have a parent profile.');
  }

  const student = await request('/admin/students', {
    method: 'POST',
    token: admin.token,
    body: JSON.stringify({
      parentId: parent.id,
      fullName: 'Smoke Student',
      age: 12,
      grade: 'JSS',
      school: 'Smoke School',
      intake: {
        subject: 'Maths',
        subjects: ['Maths'],
        learningGoal: 'GENERAL_IMPROVEMENT',
        currentLevel: 'AVERAGE',
        teacherGenderPref: 'NO_PREFERENCE',
        timezone: 'Africa/Lagos',
        sessionsPerWeek: '1',
        budget: 'Under $20',
        schedule: [{ day: 'MON', time: 'EVENING' }],
      },
    }),
    label: 'admin create student',
  });
  console.log('OK admin creates student and intake');

  await request(`/admin/students/${student.student.id}/assign-teacher`, {
    method: 'POST',
    token: admin.token,
    body: JSON.stringify({ teacherId: teacher.teacher.id }),
    label: 'admin assign teacher',
  });
  console.log('OK admin assigns teacher');

  const teacherLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: teacherEmail,
      password: teacherDefaultPassword,
    }),
    label: 'teacher login default',
  });
  if (!teacherLogin.user.mustChangePassword) {
    throw new Error('Expected teacher to be forced to change password.');
  }

  const teacherChanged = await request('/auth/change-password', {
    method: 'POST',
    token: teacherLogin.token,
    body: JSON.stringify({
      currentPassword: teacherDefaultPassword,
      newPassword: teacherNewPassword,
    }),
    label: 'teacher change password',
  });
  console.log('OK teacher changes default password');

  const proposal = await request('/teacher/session-proposals', {
    method: 'POST',
    token: teacherChanged.token,
    body: JSON.stringify({
      studentId: student.student.id,
      subject: 'Maths',
      startsAt: nextMondayEveningIso(),
      durationMins: 60,
      timeBlock: 'EVENING',
      note: 'Smoke test proposal',
    }),
    label: 'teacher propose session',
  });
  console.log('OK teacher proposes session');

  const accepted = await request(
    `/family/session-proposals/${proposal.proposal.id}/accept`,
    {
      method: 'POST',
      token: family.token,
      label: 'family accept proposal',
    },
  );
  const sessionId = accepted.session.id;
  console.log('OK family accepts proposal');

  await request(`/admin/sessions/${sessionId}/meeting-link`, {
    method: 'PATCH',
    token: admin.token,
    body: JSON.stringify({
      meetLink: 'https://meet.google.com/smoke-test-link',
    }),
    label: 'admin meeting link',
  });
  console.log('OK admin saves meeting link');

  await request(`/teacher/sessions/${sessionId}/attendance/confirm`, {
    method: 'POST',
    token: teacherChanged.token,
    label: 'teacher confirm attendance',
  });

  const familyAttendance = await request(
    `/family/sessions/${sessionId}/attendance/confirm`,
    {
      method: 'POST',
      token: family.token,
      label: 'family confirm attendance',
    },
  );
  if (familyAttendance.session.status !== 'COMPLETED') {
    throw new Error('Expected dual attendance to complete the session.');
  }
  console.log('OK dual attendance completes session');

  await request(`/teacher/sessions/${sessionId}/notes`, {
    method: 'POST',
    token: teacherChanged.token,
    body: JSON.stringify({
      covered: 'Smoke test topic',
      performance: 'GOOD',
      rating: 4,
      focusNext: 'Smoke test next step',
      concerns: '',
    }),
    label: 'teacher note',
  });
  console.log('OK teacher submits note');

  const familySessions = await request('/family/sessions', {
    token: family.token,
    label: 'family sessions',
  });
  const finalSession = familySessions.sessions.find((item) => item.id === sessionId);
  if (!finalSession || !finalSession.note || !finalSession.meetLink) {
    throw new Error('Expected family to see completed session note and meeting link.');
  }
  console.log('OK family sees completed session with note and meeting link');
}

main()
  .then(async () => {
    await cleanup();
    console.log('OK cleanup complete');
  })
  .catch(async (error) => {
    console.error(error.message);
    await cleanup().catch((cleanupError) => {
      console.error(`Cleanup failed: ${cleanupError.message}`);
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
