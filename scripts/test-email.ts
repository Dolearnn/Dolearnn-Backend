/*
 * Sends one test email with the current .env settings and prints exactly what
 * the provider said. Use it to check an API key or a sending domain.
 *
 *   npm run email:test -- you@example.com
 */
import { closeEmail, describeEmailConfig, sendEmail } from '../src/lib/email';

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes('@')) {
    console.error('Usage: npm run email:test -- you@example.com');
    process.exitCode = 1;
    return;
  }

  console.log(describeEmailConfig());
  const id = await sendEmail({
    to,
    subject: 'DoLearn test email',
    text: 'This is a test email from the DoLearn backend. If you can read it, email delivery works.',
    html: '<p>This is a test email from the DoLearn backend.</p><p>If you can read it, email delivery works.</p>',
  });

  if (id === undefined) {
    console.log('Nothing was sent: email is not configured (see the line above).');
    process.exitCode = 1;
    return;
  }
  console.log(`Sent. Provider message id: ${id}. Check the inbox (and spam folder) of ${to}.`);
}

main()
  .catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  })
  .finally(closeEmail);
