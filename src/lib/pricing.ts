import { env } from '../config/env';

/*
 * Tutoring prices, in naira.
 *
 * A learner pays TUTORING_SESSION_PRICE per session (₦10,000 by default).
 * A tutor is paid their own per-session rate, stored in TeacherProfile.hourlyRate
 * (the column name predates per-session pricing). By default that is 50% of the
 * session price: "tutors keep 50%".
 */
export const DEFAULT_TUTOR_SHARE = 0.5;

export function sessionPrice() {
  return env.TUTORING_SESSION_PRICE;
}

export function defaultTutorPay() {
  return Math.round(env.TUTORING_SESSION_PRICE * DEFAULT_TUTOR_SHARE);
}
