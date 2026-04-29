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
  await resend.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

async function sendWithSendGrid(message: EmailMessage) {
  const apiKey = env.SENDGRID_API_KEY;
  const from = fromAddress();

  if (!apiKey || !from) {
    warnEmailDisabled();
    return;
  }

  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to: message.to,
    from,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendEmail(message: EmailMessage) {
  const configError = emailProviderConfigError();
  if (configError) {
    warnEmailDisabled();
    return;
  }

  if (env.EMAIL_PROVIDER === 'resend') {
    await sendWithResend(message);
    return;
  }

  await sendWithSendGrid(message);
}

export async function sendBulkEmail(messages: EmailMessage[]) {
  await Promise.all(messages.map((message) => sendEmail(message)));
}
