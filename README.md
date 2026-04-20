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
npm run check-db
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

## Current Status

This folder is a starter scaffold with the first database schema. The frontend still uses mock data and browser local storage until the backend API is implemented.
