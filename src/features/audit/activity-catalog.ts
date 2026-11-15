import { AuditCategory as C } from './audit.service';

/*
 * Every action a user can take through the API, in plain words, for the admin
 * activity log. The activity-log middleware matches each finished request
 * against this list. A request that matches nothing is still logged (as OTHER)
 * when a signed-in user made it, so new endpoints never go unrecorded; add them
 * here to give them a proper name.
 *
 * Privacy: describers may only read the specific fields they name. Never copy
 * whole request bodies, passwords, tokens or bank details into the log.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ActivityContext {
  params: Record<string, string>;
  /** The parsed request body. Read named fields only. */
  body: any;
  /** The JSON the endpoint sent back (successful requests only). */
  response: any;
}

export interface ActivityRoute {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Full path under /api, with :params. */
  path: string;
  action: string;
  category: string;
  entityType: string;
  /** Past tense, used for successful requests: "Signed in". */
  title: string;
  /** Infinitive, used for failed ones: "Tried to sign in". */
  verb: string;
  /** Extra detail appended to the title when the request succeeded. */
  detail?: (ctx: ActivityContext) => string | undefined | null | false;
  /** Which id the entry is about; defaults to the first route param, then the actor. */
  entity?: (ctx: ActivityContext) => string | undefined | null;
  /** A service already writes a richer entry on success; log failures only. */
  explicit?: boolean;
  /** Also log visitors who are not signed in. */
  guests?: boolean;
  /** Identify the account from the email in the request body (sign-in, password reset). */
  actorFromEmail?: boolean;
}

function str(value: unknown, max = 80) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function words(value: unknown) {
  const text = str(value);
  return text ? text.toLowerCase().replace(/_/g, ' ') : undefined;
}

function join(...parts: Array<string | undefined | null | false>) {
  const kept = parts.filter(Boolean);
  return kept.length ? kept.join(', ') : undefined;
}

function attemptDetail(response: any) {
  const attempt = response?.attempt;
  const result = response?.result;
  return join(
    str(attempt?.subject?.name),
    words(attempt?.mode),
    result
      ? `scored ${result.scorePercent ?? 0}% (${result.correctCount ?? 0}/${result.totalQuestions ?? attempt?.totalQuestions ?? '?'})`
      : attempt?.totalQuestions
        ? `${attempt.totalQuestions} questions`
        : undefined,
    result?.timedOut ? 'timed out' : undefined,
  );
}

function battleCode(ctx: ActivityContext) {
  return (
    str(ctx.params.code) ??
    str(ctx.response?.code) ??
    str(ctx.response?.battle?.code) ??
    str(ctx.response?.challenge?.code)
  );
}

const r = (
  method: ActivityRoute['method'],
  path: string,
  action: string,
  category: string,
  entityType: string,
  title: string,
  verb: string,
  options: Partial<ActivityRoute> = {},
): ActivityRoute => ({ method, path, action, category, entityType, title, verb, ...options });

export const ACTIVITY_ROUTES: ActivityRoute[] = [
  // ---- Sign-in and account ----
  r('POST', '/auth/register', 'ACCOUNT_REGISTERED', C.AUTH, 'USER', 'Created an account', 'create an account', {
    guests: true,
    actorFromEmail: true,
    detail: ({ response }) => join(str(response?.user?.email), words(response?.user?.role)),
    entity: ({ response, body }) => str(response?.user?.id) ?? str(body?.email),
  }),
  r('POST', '/auth/login', 'SIGNED_IN', C.AUTH, 'USER', 'Signed in with email and password', 'sign in', {
    guests: true,
    actorFromEmail: true,
    entity: ({ response, body }) => str(response?.user?.id) ?? str(body?.email),
  }),
  r('POST', '/auth/google', 'SIGNED_IN_GOOGLE', C.AUTH, 'USER', 'Signed in with Google', 'sign in with Google', {
    guests: true,
    entity: ({ response }) => str(response?.user?.id) ?? 'google',
  }),
  r('POST', '/auth/logout', 'SIGNED_OUT', C.AUTH, 'USER', 'Signed out', 'sign out'),
  r('POST', '/auth/change-password', 'PASSWORD_CHANGED', C.AUTH, 'USER', 'Changed their password', 'change their password'),
  r('POST', '/auth/forgot-password', 'PASSWORD_RESET_REQUESTED', C.AUTH, 'USER', 'Asked for a password reset email', 'ask for a password reset', {
    guests: true,
    actorFromEmail: true,
    entity: ({ body }) => str(body?.email),
  }),
  r('POST', '/auth/reset-password', 'PASSWORD_RESET', C.AUTH, 'USER', 'Reset their password from the email link', 'reset their password', {
    guests: true,
    entity: ({ response }) => str(response?.user?.id) ?? 'reset-link',
  }),

  r('PUT', '/student/onboarding', 'ONBOARDING_SAVED', C.ACCOUNT, 'USER', 'Completed onboarding', 'save onboarding', {
    detail: ({ body }) =>
      join(
        words(body?.stage),
        Array.isArray(body?.externalExams)
          ? `exams: ${body.externalExams.slice(0, 5).map((e: unknown) => str(e, 30)).join(', ')}`
          : undefined,
        Array.isArray(body?.subjectIds) ? `${body.subjectIds.length} subjects` : undefined,
      ),
  }),
  r('PUT', '/student/reminders', 'REMINDERS_UPDATED', C.ACCOUNT, 'USER', 'Changed reminder settings', 'change reminder settings', {
    detail: ({ body }) => (typeof body?.enabled === 'boolean' ? (body.enabled ? 'turned on' : 'turned off') : undefined),
  }),
  r('PUT', '/student/guest-baseline', 'GUEST_BASELINE_SAVED', C.PRACTICE, 'USER', 'Saved the practice test they took before signing up', 'save their guest test', {
    detail: ({ body }) => (typeof body?.guestBaseline?.score === 'number' ? `scored ${body.guestBaseline.score}%` : undefined),
  }),

  // ---- Practice ----
  r('POST', '/quiz/attempts', 'QUIZ_STARTED', C.PRACTICE, 'QUIZ_ATTEMPT', 'Started a practice test', 'start a practice test', {
    detail: ({ response, body }) => join(attemptDetail(response), body?.retakeOfAttemptId ? 'retake of weak topics' : undefined),
    entity: ({ response }) => str(response?.attempt?.id),
  }),
  r('POST', '/quiz/attempts/:attemptId/submit', 'QUIZ_SUBMITTED', C.PRACTICE, 'QUIZ_ATTEMPT', 'Submitted a practice test', 'submit a practice test', {
    detail: ({ response }) => attemptDetail(response),
  }),
  r('POST', '/quiz/attempts/:attemptId/questions/:questionId/explain', 'AI_EXPLANATION_REQUESTED', C.PRACTICE, 'QUESTION', 'Asked the AI to explain a question', 'get an AI explanation', {
    entity: ({ params }) => params.questionId,
  }),
  r('POST', '/quiz/attempts/:attemptId/diagnosis', 'AI_DIAGNOSIS_REQUESTED', C.PRACTICE, 'QUIZ_ATTEMPT', 'Asked for an AI diagnosis of a test', 'get an AI diagnosis'),
  r('PATCH', '/quiz/leaderboard/privacy', 'LEADERBOARD_PRIVACY_CHANGED', C.ACCOUNT, 'USER', 'Changed leaderboard privacy', 'change leaderboard privacy', {
    detail: ({ body }) => (typeof body?.hidden === 'boolean' ? (body.hidden ? 'name hidden' : 'name shown') : undefined),
  }),
  r('POST', '/question-reports', 'QUESTION_REPORTED', C.PRACTICE, 'QUESTION', 'Reported a problem with a question', 'report a question', {
    detail: ({ body }) => join(words(body?.reason), body?.kind === 'daily' ? 'daily challenge' : undefined),
    entity: ({ body }) => str(body?.questionId),
    guests: true,
  }),
  r('POST', '/question-reports/resolve', 'QUESTION_REPORT_RESOLVED', C.CONTENT, 'QUESTION', 'Resolved question reports', 'resolve question reports', {
    entity: ({ body }) => str(body?.questionId),
  }),

  // ---- Arena ----
  r('POST', '/arena/challenges', 'ARENA_BATTLE_CREATED', C.ARENA, 'ARENA_BATTLE', 'Created an Arena battle', 'create an Arena battle', {
    detail: (ctx) => join(battleCode(ctx) && `code ${battleCode(ctx)}`, ctx.body?.count && `${ctx.body.count} questions`),
    entity: (ctx) => battleCode(ctx),
  }),
  r('POST', '/arena/challenges/:code/join', 'ARENA_BATTLE_JOINED', C.ARENA, 'ARENA_BATTLE', 'Joined an Arena battle', 'join an Arena battle', {
    detail: (ctx) => `code ${ctx.params.code}`,
  }),

  // ---- Daily challenge (signed-in players only; guests play anonymously) ----
  r('POST', '/daily/start', 'DAILY_STARTED', C.DAILY, 'DAILY', "Started today's daily challenge", 'start the daily challenge', {
    entity: () => new Date().toISOString().slice(0, 10),
  }),
  r('POST', '/daily/answer', 'DAILY_ANSWERED', C.DAILY, 'DAILY', 'Answered a daily challenge question', 'answer a daily question', {
    detail: ({ response }) =>
      typeof response?.correct === 'boolean' ? (response.correct ? 'correct' : 'wrong') : undefined,
    entity: ({ body }) => str(body?.questionId),
  }),
  r('POST', '/daily/claim', 'DAILY_CLAIMED', C.DAILY, 'DAILY', 'Claimed a daily score played before signing in', 'claim a daily score'),
  r('PUT', '/daily/nickname', 'DAILY_NICKNAME_SET', C.DAILY, 'USER', 'Set their daily leaderboard nickname', 'set a nickname', {
    detail: ({ body }) => str(body?.nickname, 40),
  }),

  // ---- Tutoring (learner side) ----
  r('POST', '/family/students', 'TUTORING_PROFILE_CREATED', C.TUTORING, 'STUDENT', 'Set up their tutoring profile', 'set up a tutoring profile', {
    entity: ({ response }) => str(response?.student?.id) ?? str(response?.id),
  }),
  r('PUT', '/family/students/:studentId', 'TUTORING_PROFILE_UPDATED', C.TUTORING, 'STUDENT', 'Updated their tutoring profile', 'update the tutoring profile'),
  r('PUT', '/family/students/:studentId/intake', 'TUTORING_INTAKE_SAVED', C.TUTORING, 'STUDENT', 'Filled in the tutoring intake form', 'save the intake form'),
  r('PUT', '/family/students/:studentId/goal', 'LEARNING_GOAL_SET', C.TUTORING, 'STUDENT', 'Set a learning goal', 'set a learning goal'),
  r('POST', '/family/students/:studentId/deactivate', 'TUTORING_PROFILE_DEACTIVATED', C.TUTORING, 'STUDENT', 'Paused their tutoring profile', 'pause the tutoring profile'),
  r('POST', '/family/students/:studentId/reactivate', 'TUTORING_PROFILE_REACTIVATED', C.TUTORING, 'STUDENT', 'Reactivated their tutoring profile', 'reactivate the tutoring profile'),
  r('POST', '/family/booking-requests', 'TUTOR_BOOKING_REQUESTED', C.TUTORING, 'BOOKING_REQUEST', 'Requested tutoring sessions', 'request tutoring', {
    detail: ({ body }) =>
      join(
        str(body?.subject),
        body?.sessionsRequested && `${body.sessionsRequested} sessions`,
        body?.day && body?.startTime && `${words(body.day)} ${str(body.startTime)}`,
      ),
    entity: ({ response, body }) => str(response?.request?.id) ?? str(response?.id) ?? str(body?.studentId),
  }),
  r('POST', '/family/sessions/:sessionId/attendance/confirm', 'FAMILY_ATTENDANCE_CONFIRMED', C.TUTORING, 'ATTENDANCE', 'Confirmed a lesson took place', 'confirm attendance', { explicit: true }),
  r('POST', '/family/sessions/:sessionId/cancellations', 'CANCELLATION_REQUESTED', C.TUTORING, 'SESSION', 'Asked to cancel a lesson', 'ask to cancel a lesson'),

  // ---- Tutoring (teacher side) ----
  r('PATCH', '/teacher/me', 'TEACHER_PROFILE_UPDATED', C.ACCOUNT, 'TEACHER', 'Updated their teacher profile', 'update their teacher profile'),
  r('PATCH', '/teacher/payout-account', 'PAYOUT_ACCOUNT_UPDATED', C.PAYMENTS, 'TEACHER', 'Changed their payout bank details', 'change payout bank details'),
  r('POST', '/teacher/sessions/:sessionId/attendance/confirm', 'TEACHER_ATTENDANCE_CONFIRMED', C.TUTORING, 'ATTENDANCE', 'Confirmed they taught a lesson', 'confirm attendance', { explicit: true }),
  r('POST', '/teacher/sessions/:sessionId/notes', 'LESSON_NOTES_ADDED', C.TUTORING, 'SESSION', 'Wrote lesson notes', 'write lesson notes'),
  r('POST', '/teacher/sessions/:sessionId/notes/contact-attempt', 'NO_SHOW_CONTACT_LOGGED', C.TUTORING, 'SESSION', 'Logged trying to reach an absent learner', 'log a contact attempt'),
  r('POST', '/teacher/sessions/:sessionId/cancellations', 'CANCELLATION_REQUESTED', C.TUTORING, 'SESSION', 'Asked to cancel a lesson', 'ask to cancel a lesson'),

  // ---- Notifications ----
  r('PATCH', '/notifications/:notificationId/read', 'NOTIFICATION_READ', C.NOTIFICATIONS, 'NOTIFICATION', 'Read a notification', 'mark a notification read'),
  r('POST', '/notifications/read-all', 'NOTIFICATIONS_ALL_READ', C.NOTIFICATIONS, 'NOTIFICATION', 'Marked all notifications read', 'mark all notifications read'),

  // ---- Public forms (visitors) ----
  r('POST', '/public/waitlist', 'WAITLIST_JOINED', C.PUBLIC, 'LEAD', 'Joined the waitlist', 'join the waitlist', {
    guests: true,
    entity: ({ body }) => str(body?.email),
  }),
  r('POST', '/public/newsletter', 'NEWSLETTER_SUBSCRIBED', C.PUBLIC, 'LEAD', 'Subscribed to the newsletter', 'subscribe to the newsletter', {
    guests: true,
    entity: ({ body }) => str(body?.email),
  }),
  r('POST', '/public/reminders/off', 'REMINDER_EMAILS_TURNED_OFF', C.ACCOUNT, 'USER', 'Turned off reminder emails from an email link', 'turn off reminder emails', {
    guests: true,
    entity: () => 'unsubscribe-link',
  }),

  // ---- Admin: people ----
  r('POST', '/admin/students', 'STUDENT_CREATED', C.ADMIN, 'STUDENT', 'Added a learner', 'add a learner', { explicit: true }),
  r('POST', '/admin/students/:studentId/assign-teacher', 'TEACHER_ASSIGNED', C.ADMIN, 'STUDENT', 'Assigned a tutor to a learner', 'assign a tutor', {
    detail: ({ body }) => str(body?.subject),
  }),
  r('POST', '/admin/students/:studentId/unassign-teacher', 'TEACHER_UNASSIGNED', C.ADMIN, 'STUDENT', 'Removed a tutor from a learner', 'remove a tutor'),
  r('POST', '/admin/teachers', 'TEACHER_CREATED', C.ADMIN, 'TEACHER', 'Added a tutor', 'add a tutor', {
    detail: ({ body }) => str(body?.name),
    entity: ({ response, body }) => str(response?.teacher?.id) ?? str(body?.email),
  }),
  r('POST', '/admin/teachers/:teacherId/invite', 'TEACHER_INVITED', C.ADMIN, 'TEACHER', 'Sent a tutor their invite', 'send a tutor invite'),
  r('PATCH', '/admin/teachers/:teacherId/subjects', 'TEACHER_SUBJECTS_UPDATED', C.ADMIN, 'TEACHER', "Changed a tutor's subjects", "change a tutor's subjects"),
  r('PATCH', '/admin/teachers/:teacherId/rate', 'TEACHER_RATE_UPDATED', C.ADMIN, 'TEACHER', "Changed a tutor's pay rate", "change a tutor's rate", { explicit: true }),
  r('POST', '/admin/teachers/:teacherId/terminate', 'TEACHER_TERMINATED', C.ADMIN, 'TEACHER', 'Removed a tutor', 'remove a tutor', { explicit: true }),
  r('PUT', '/admin/teachers/:teacherId/weekly-hours', 'TEACHER_HOURS_UPDATED', C.ADMIN, 'TEACHER', "Changed a tutor's weekly hours", "change a tutor's hours"),
  r('PATCH', '/admin/leads/:leadId/status', 'LEAD_STATUS_UPDATED', C.ADMIN, 'LEAD', "Changed a lead's status", "change a lead's status", {
    detail: ({ body }) => words(body?.status),
  }),

  // ---- Admin: sessions and payments ----
  r('POST', '/admin/sessions', 'SESSION_SCHEDULED', C.ADMIN, 'SESSION', 'Scheduled a lesson', 'schedule a lesson', {
    detail: ({ body }) => str(body?.subject),
    entity: ({ response }) => str(response?.session?.id) ?? str(response?.id),
  }),
  r('PATCH', '/admin/sessions/:sessionId/meeting-link', 'MEETING_LINK_UPDATED', C.ADMIN, 'SESSION', 'Changed a meeting link', 'change a meeting link', { explicit: true }),
  r('POST', '/admin/sessions/booking-requests/:requestId/schedule', 'BOOKING_REQUEST_SCHEDULED', C.ADMIN, 'BOOKING_REQUEST', 'Scheduled lessons from a booking request', 'schedule a booking request'),
  r('POST', '/admin/sessions/booking-requests/:requestId/decline', 'BOOKING_REQUEST_DECLINED', C.ADMIN, 'BOOKING_REQUEST', 'Declined a booking request', 'decline a booking request'),
  r('POST', '/admin/sessions/cancellations/:requestId/approve', 'CANCELLATION_APPROVED', C.ADMIN, 'CANCELLATION', 'Approved a cancellation', 'approve a cancellation', { explicit: true }),
  r('POST', '/admin/sessions/cancellations/:requestId/reject', 'CANCELLATION_REJECTED', C.ADMIN, 'CANCELLATION', 'Rejected a cancellation', 'reject a cancellation', { explicit: true }),
  r('POST', '/admin/payments', 'PAYMENT_RECORDED', C.PAYMENTS, 'PAYMENT', 'Recorded a payment', 'record a payment', { explicit: true }),
  r('POST', '/admin/payments/payouts/mark-paid', 'PAYOUT_MARKED_PAID', C.PAYMENTS, 'PAYOUT', 'Marked a tutor payout as paid', 'mark a payout paid', { explicit: true }),

  // ---- Admin: question bank ----
  r('POST', '/admin/quiz/exams', 'EXAM_CREATED', C.CONTENT, 'EXAM', 'Added an exam', 'add an exam', {
    detail: ({ body }) => str(body?.name),
  }),
  r('PATCH', '/admin/quiz/exams/:examId', 'EXAM_UPDATED', C.CONTENT, 'EXAM', 'Edited an exam', 'edit an exam'),
  r('POST', '/admin/quiz/subjects', 'SUBJECT_CREATED', C.CONTENT, 'SUBJECT', 'Added a subject', 'add a subject', {
    detail: ({ body }) => str(body?.name),
  }),
  r('PATCH', '/admin/quiz/subjects/:subjectId', 'SUBJECT_UPDATED', C.CONTENT, 'SUBJECT', 'Edited a subject', 'edit a subject'),
  r('POST', '/admin/quiz/topics', 'TOPIC_CREATED', C.CONTENT, 'TOPIC', 'Added a topic', 'add a topic', {
    detail: ({ body }) => str(body?.name),
  }),
  r('POST', '/admin/quiz/questions/import', 'QUESTIONS_IMPORTED', C.CONTENT, 'QUESTION', 'Imported questions', 'import questions', {
    detail: ({ body, response }) =>
      join(
        Array.isArray(body?.questions) ? `${body.questions.length} rows sent` : undefined,
        typeof response?.created === 'number' ? `${response.created} added` : undefined,
      ),
    entity: () => 'import',
  }),
  r('POST', '/admin/quiz/questions/status', 'QUESTIONS_STATUS_CHANGED', C.CONTENT, 'QUESTION', 'Published or unpublished questions', 'change question status', {
    detail: ({ body }) =>
      join(words(body?.status), Array.isArray(body?.questionIds) ? `${body.questionIds.length} questions` : undefined),
    entity: () => 'bulk',
  }),
  r('PATCH', '/admin/quiz/questions/:questionId', 'QUESTION_EDITED', C.CONTENT, 'QUESTION', 'Edited a question', 'edit a question'),
  r('POST', '/daily/admin/questions', 'DAILY_QUESTION_CREATED', C.CONTENT, 'DAILY_QUESTION', 'Added a daily challenge question', 'add a daily question', {
    entity: ({ response }) => str(response?.id) ?? str(response?.question?.id),
  }),
  r('PUT', '/daily/admin/questions/:id', 'DAILY_QUESTION_EDITED', C.CONTENT, 'DAILY_QUESTION', 'Edited a daily challenge question', 'edit a daily question'),
  r('DELETE', '/daily/admin/questions/:id', 'DAILY_QUESTION_DELETED', C.CONTENT, 'DAILY_QUESTION', 'Deleted a daily challenge question', 'delete a daily question'),
];

interface CompiledRoute {
  route: ActivityRoute;
  pattern: RegExp;
  keys: string[];
}

const COMPILED: CompiledRoute[] = ACTIVITY_ROUTES.map((route) => {
  const keys: string[] = [];
  const source = route.path
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        keys.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { route, keys, pattern: new RegExp(`^${source}/?$`) };
});

/** Finds the catalog entry for a request path under /api (e.g. "/quiz/attempts/abc/submit"). */
export function matchActivityRoute(method: string, path: string) {
  for (const { route, pattern, keys } of COMPILED) {
    if (route.method !== method) continue;
    const match = pattern.exec(path);
    if (!match) continue;
    const params: Record<string, string> = {};
    keys.forEach((key, index) => {
      try {
        params[key] = decodeURIComponent(match[index + 1]);
      } catch {
        params[key] = match[index + 1];
      }
    });
    return { route, params };
  }
  return null;
}

/** All known actions, for the admin filter. */
export const KNOWN_ACTIONS = Array.from(new Set(ACTIVITY_ROUTES.map((route) => route.action)));
