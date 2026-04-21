DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "User") <> 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 user';
  END IF;

  IF (SELECT COUNT(*) FROM "User" WHERE "email" = 'dolearnnn@gmail.com') <> 1 THEN
    RAISE EXCEPTION 'Expected the admin account to remain';
  END IF;

  IF (SELECT COUNT(*) FROM "ParentProfile") <> 0 THEN
    RAISE EXCEPTION 'Expected 0 parent profiles';
  END IF;

  IF (SELECT COUNT(*) FROM "TeacherProfile") <> 0 THEN
    RAISE EXCEPTION 'Expected 0 teacher profiles';
  END IF;

  IF (SELECT COUNT(*) FROM "Student") <> 0 THEN
    RAISE EXCEPTION 'Expected 0 students';
  END IF;

  IF (SELECT COUNT(*) FROM "Session") <> 0 THEN
    RAISE EXCEPTION 'Expected 0 sessions';
  END IF;

  IF (SELECT COUNT(*) FROM "Payment") <> 0 THEN
    RAISE EXCEPTION 'Expected 0 payments';
  END IF;

  IF (SELECT COUNT(*) FROM "Notification") <> 0 THEN
    RAISE EXCEPTION 'Expected 0 notifications';
  END IF;
END $$;
