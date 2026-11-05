import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';
import { env } from '../config/env';

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let warnedMissingEmailConfig = false;

function fromAddress() {
  if (!env.EMAIL_FROM_EMAIL) return null;

  return env.EMAIL_FROM_NAME
    ? `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_EMAIL}>`
    : env.EMAIL_FROM_EMAIL;
}

function emailProviderConfigError() {
  if (!env.EMAIL_PROVIDER) {
    return 'EMAIL_PROVIDER is not configured';
  }

  if (!fromAddress()) {
    return 'EMAIL_FROM_EMAIL is not configured';
  }

  if (env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
    return 'RESEND_API_KEY is not configured';
  }

  if (env.EMAIL_PROVIDER === 'sendgrid' && !env.SENDGRID_API_KEY) {
    return 'SENDGRID_API_KEY is not configured';
  }

  return null;
}

function warnEmailDisabled() {
  if (warnedMissingEmailConfig) return;
  warnedMissingEmailConfig = true;
  console.warn(
    `Email delivery is disabled. ${emailProviderConfigError() ?? 'Provider configuration is incomplete.'}`,
  );
}

async function sendWithResend(message: EmailMessage) {
  const apiKey = env.RESEND_API_KEY;
  const from = fromAddress();

  if (!apiKey || !from) {
    warnEmailDisabled();
    return;
  }

  const resend = new Resend(apiKey);
  // The Resend SDK does not throw on API errors (bad key, unverified domain,
  // rate limit); it returns them. Without this check failures are silent.
  const { data, error } = await resend.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  if (error) {
    throw new Error(`Resend rejected the email to ${message.to}: ${error.name}: ${error.message}`);
  }

  return data?.id;
}

async function sendWithSendGrid(message: EmailMessage) {
  const apiKey = env.SENDGRID_API_KEY;
  const from = fromAddress();

  if (!apiKey || !from) {
    warnEmailDisabled();
    return;
  }

  sgMail.setApiKey(apiKey);
  try {
    const [response] = await sgMail.send({
      to: message.to,
      from,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return response.headers['x-message-id'] as string | undefined;
  } catch (error) {
    // SendGrid puts the useful reason in response.body.errors.
    const details = (error as { response?: { body?: unknown } }).response?.body;
    throw new Error(
      `SendGrid rejected the email to ${message.to}: ${
        details ? JSON.stringify(details) : (error as Error).message
      }`,
    );
  }
}

/**
 * Sends one email. Returns the provider's message id, or undefined when email
 * is not configured (a warning is logged once). Throws when the provider
 * rejects the message.
 */
export async function sendEmail(message: EmailMessage) {
  const configError = emailProviderConfigError();
  if (configError) {
    warnEmailDisabled();
    return undefined;
  }

  const id =
    env.EMAIL_PROVIDER === 'resend'
      ? await sendWithResend(message)
      : await sendWithSendGrid(message);

  console.info(`Email sent via ${env.EMAIL_PROVIDER} to ${message.to}: "${message.subject}" (${id ?? 'no id'})`);
  return id;
}

/** Sends every message; one failure does not stop the others. Failures are logged. */
export async function sendBulkEmail(messages: EmailMessage[]) {
  const results = await Promise.allSettled(messages.map((message) => sendEmail(message)));
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Email delivery failed:', (result.reason as Error).message);
    }
  }
}

/** One-line description of the email setup, for the startup log. */
export function describeEmailConfig() {
  const error = emailProviderConfigError();
  if (error) return `Email disabled: ${error}`;
  return `Email enabled: ${env.EMAIL_PROVIDER} from ${fromAddress()}`;
}
