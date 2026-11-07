import type { User } from '@prisma/client';
import { env } from '../../../config/env';
import { sendEmail } from '../../../lib/email';
import { passwordSetupLink } from '../../auth/auth.service';

/*
 * Tutor invites: instead of the admin choosing a password and passing it on,
 * the tutor gets an email with a single-use link to set their own password.
 */
export const TUTOR_INVITE_VALID_DAYS = 7;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Sends the invite. Returns true when the email was handed to the mail server. */
export async function sendTutorInvite(user: Pick<User, 'id' | 'email' | 'name' | 'updatedAt'>) {
  const link = passwordSetupLink(user, `${TUTOR_INVITE_VALID_DAYS}d`);
  const loginUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/login`;
  const firstName = user.name.split(' ')[0] || user.name;

  const id = await sendEmail({
    to: user.email,
    subject: "You're invited to tutor on DoLearnn",
    text: [
      `Hello ${firstName},`,
      '',
      'You have been added as a tutor on DoLearnn.',
      `Set your password here (the link works once and expires in ${TUTOR_INVITE_VALID_DAYS} days):`,
      link,
      '',
      `After that, sign in at ${loginUrl} with ${user.email}.`,
      'Then add your payout account on your profile. Your students and their learning summaries appear under Students once you are matched.',
    ].join('\n'),
    html: [
      `<p>Hello ${escapeHtml(firstName)},</p>`,
      '<p>You have been added as a tutor on DoLearnn.</p>',
      `<p><a href="${link}">Set your password</a><br>This link works once and expires in ${TUTOR_INVITE_VALID_DAYS} days.</p>`,
      `<p>After that, sign in at <a href="${loginUrl}">${escapeHtml(loginUrl)}</a> with ${escapeHtml(user.email)}.</p>`,
      '<p>Then add your payout account on your profile. Your students and their learning summaries appear under Students once you are matched.</p>',
    ].join(''),
  });

  return id !== undefined;
}
