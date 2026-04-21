BEGIN;

DELETE FROM "CancellationRequest";
DELETE FROM "SessionNote";
DELETE FROM "Attendance";
DELETE FROM "Session";
DELETE FROM "SessionProposal";
DELETE FROM "SessionBookingRequest";
DELETE FROM "StudentSubjectAssignment";
DELETE FROM "Goal";
DELETE FROM "IntakeSchedule";
DELETE FROM "Intake";
DELETE FROM "Notification";
DELETE FROM "Payment";
DELETE FROM "TeacherPayout";
DELETE FROM "Student";
DELETE FROM "ParentProfile";
DELETE FROM "TeacherProfile";
DELETE FROM "User"
WHERE "email" <> 'dolearnnn@gmail.com';

COMMIT;
