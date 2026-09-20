# DoLearn Backend

Express API workspace for the DoLearn backend.

Planned stack:

- Express.js
- TypeScript
- PostgreSQL
- Prisma
- Zod validation
- Email/password auth
- Google OAuth

## Local Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The API starts on `http://localhost:4000` by default.

Health check:

```txt
http://localhost:4000/api/health
```

Swagger API docs:

```txt
http://localhost:4000/api/docs
```

OpenAPI JSON:

```txt
http://localhost:4000/api/docs.json
```

## Database

The Prisma schema lives at:

```txt
prisma/schema.prisma
```

Set `DATABASE_URL` in `.env` before running migrations.

Example local PostgreSQL URL:

```txt
DATABASE_URL="postgresql://postgres:password@localhost:5432/dolearn?schema=public"
```

Useful commands:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run reset-data
npm run check-db
npm run smoke
```

`npm run reset-data` clears app data for local testing while preserving every admin login account. It removes leads, notifications, sessions, payments, students, parents, teachers, and other operational records, then prints the admin users left behind.

`npm run smoke` runs a temporary end-to-end API check against the configured backend URL. It logs in as admin, creates a temporary teacher and family, creates a student intake, assigns the teacher, proposes and accepts a session, saves the meeting link, confirms attendance from both sides, submits a teacher note, verifies the family can see the completed session, and then cleans up the temporary records.

Before running it, set:

```txt
SMOKE_API_URL="http://localhost:4000/api"
SMOKE_ADMIN_EMAIL="your-admin-email"
SMOKE_ADMIN_PASSWORD="your-admin-password"
```

## Auth

Auth will support email/password and Google OAuth. Families can create accounts with Google, but teachers can only use Google if admin already created their teacher account.

Current auth endpoints:

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
GET  /api/auth/me
POST /api/auth/logout
```

Authenticated requests should send:

```txt
Authorization: Bearer <token>
```

See:

```txt
docs/auth.md
```

## Admin Teacher Management

Admin-only teacher endpoints:

```txt
GET   /api/admin/teachers
POST  /api/admin/teachers
PATCH /api/admin/teachers/:teacherId/rate
POST  /api/admin/teachers/:teacherId/terminate
```

`POST /api/admin/teachers` creates both:

- A `User` with role `TEACHER`
- A linked `TeacherProfile`

`POST /api/admin/teachers/:teacherId/terminate` marks the teacher and their user account as terminated, stores the reason, and unassigns all students currently matched to that teacher.

## Admin Student Matching

Admin-only student matching endpoints:

```txt
GET  /api/admin/students
GET  /api/admin/students/pending-intakes
POST /api/admin/students/:studentId/assign-teacher
POST /api/admin/students/:studentId/unassign-teacher
```

`pending-intakes` returns students who have submitted an intake but do not have an assigned teacher yet. Assignment only allows active teachers.

## Admin Sessions

Admin-only session endpoints:

```txt
GET   /api/admin/sessions
PATCH /api/admin/sessions/:sessionId/meeting-link
GET   /api/admin/sessions/cancellations
POST  /api/admin/sessions/cancellations/:requestId/approve
POST  /api/admin/sessions/cancellations/:requestId/reject
```

Admin assigns the class meeting link after a session exists. Cancellation requests remain pending until admin approves or rejects them.

## Family Students And Intakes

Family endpoints:

```txt
GET  /api/family/me
GET  /api/family/students
POST /api/family/students
PUT  /api/family/students/:studentId/intake
POST /api/family/students/:studentId/deactivate
POST /api/family/students/:studentId/reactivate
GET  /api/family/sessions
POST /api/family/sessions/:sessionId/attendance/confirm
POST /api/family/sessions/:sessionId/cancellations
GET  /api/family/session-proposals
POST /api/family/session-proposals/:proposalId/accept
POST /api/family/session-proposals/:proposalId/decline
```

These routes require a family account token. Students are always scoped to the authenticated parent, so one family cannot read or edit another family's children.

Accepting a session proposal creates a real session. The meeting link remains empty until admin assigns it.

## Teacher Students And Session Proposals

Teacher endpoints:

```txt
GET  /api/teacher/me
GET  /api/teacher/students
GET  /api/teacher/sessions
POST /api/teacher/sessions/:sessionId/attendance/confirm
POST /api/teacher/sessions/:sessionId/notes
POST /api/teacher/sessions/:sessionId/cancellations
POST /api/teacher/session-proposals
```

`POST /api/teacher/session-proposals` checks that:

- The logged-in teacher is assigned to the student.
- The student is active.
- The student has saved availability.
- The proposed date matches one of the student's available days.
- The proposed time is inside the selected Morning, Afternoon, or Evening block.

## Quizzes

The quiz section lets anyone practise exam questions (JAMB, WAEC, NECO, ...) and turns weak results into a tutoring suggestion.

Setup (one time, additive - touches no existing table):

```bash
psql "$DATABASE_URL" -f prisma/quiz-tables.sql
npm run prisma:generate
```

Player endpoints (`/api/quiz`):

```txt
GET  /api/quiz/catalog                       public, cached: exams, subjects, topics, question counts
POST /api/quiz/attempts                      start a quiz (subjectId, examId?, topicIds?, count, mode, studentId?)
GET  /api/quiz/attempts                      history, cursor-paginated
GET  /api/quiz/attempts/:id                  resume an in-progress attempt, or review a finished one
POST /api/quiz/attempts/:id/submit           grade it (safe to retry)
GET  /api/quiz/weak-topics?studentId=        running per-topic accuracy + tutoring prefill
```

Admin endpoints (`/api/admin/quiz`): `GET /overview`, `POST /exams`, `PATCH /exams/:id`, `POST /subjects`, `PATCH /subjects/:id`, `POST /topics`, `GET /questions`, `POST /questions/import`, `POST /questions/status`, `PATCH /questions/:id`.

Notes:

- Questions are only published to players when their status is `PUBLISHED`. Import creates `DRAFT` unless a row says otherwise.
- `POST /questions/import` takes up to 100 rows per request and reports per-row errors. Rows with a `sourceKey` are skipped on re-import, so a file can be re-run safely.
- Grading happens on the server. Correct answers and explanations are only sent after an attempt is submitted.
- A quiz costs two database writes (start, submit) however many questions it has. Answers and the topic breakdown are stored as JSON on the attempt.
- The catalog and the question-id pools are cached in memory for 5 minutes and cleared on any admin change. With several server instances, a change reaches the other instances within 5 minutes.
- Quiz rate limits are per user and kept in memory per instance, like the other limiters.
- Passing `studentId` (a family's own child) keeps that child's stats separate and lets the result pre-fill that child's tutoring intake.

### AI explanations

"Explain with AI" on the quiz review writes a short worked explanation for a question, grounded on the stored answer key.

Setup (one time):

```bash
npx prisma db execute --file prisma/ai-explanations.sql --schema prisma/schema.prisma
# then set ANTHROPIC_API_KEY in .env (and optionally AI_MODEL)
```

```txt
POST /api/quiz/attempts/:attemptId/questions/:questionId/explain
```

- Off until `ANTHROPIC_API_KEY` is set. `GET /api/quiz/catalog` reports `ai.explanations` so the UI only shows the button when it works.
- Only available after the quiz is submitted (it reveals the answer), and only for questions in the caller's own attempt.
- Each explanation is generated once, stored in `QuestionExplanation`, and reused for every learner, so AI cost grows with the size of the question bank, not with the number of users. Simultaneous requests for a new question share one model call.
- Failed generations are never stored, and stored explanations keep working if the key is removed.
- If the model thinks an answer key is wrong it adds a "Note:" line and the server logs a warning: check those questions.

## Current Status

This backend now powers the main frontend flows: auth, role-based access, family students and intakes, admin teacher matching, session proposals, attendance, cancellations, notes, notifications, payments, payouts, and reports.
