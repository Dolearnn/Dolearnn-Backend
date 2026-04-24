import { LeadSource } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createAdminNotifications } from '../notifications/notification.service';
import type {
  CreateNewsletterLeadInput,
  CreateWaitlistEntryInput,
} from './public.schemas';

async function upsertLead(params: {
  source: LeadSource;
  email: string;
  fullName?: string;
  phone?: string;
}) {
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName?.trim() || undefined;
  const phone = params.phone?.trim() || undefined;
  const existing = await prisma.lead.findUnique({
    where: {
      source_email: {
        source: params.source,
        email,
      },
    },
  });

  const lead = existing
    ? await prisma.lead.update({
        where: { id: existing.id },
        data: {
          fullName: fullName ?? existing.fullName,
          phone: phone ?? existing.phone,
          submissionCount: { increment: 1 },
          lastSubmittedAt: new Date(),
        },
      })
    : await prisma.lead.create({
        data: {
          source: params.source,
          fullName,
          email,
          phone,
        },
      });

  return { lead, isRepeat: !!existing };
}

export async function createWaitlistEntry(input: CreateWaitlistEntryInput) {
  const { lead, isRepeat } = await upsertLead({
    source: LeadSource.WAITLIST,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
  });

  await createAdminNotifications({
    title: isRepeat ? 'Waitlist entry updated' : 'New waitlist entry',
    body: `${lead.fullName?.trim() || 'A lead'} ${isRepeat ? 'updated their waitlist details' : 'joined the waitlist'}. Email: ${lead.email}. WhatsApp: ${lead.phone || 'not provided'}. Total submissions: ${lead.submissionCount}.`,
  });

  return { ok: true, leadId: lead.id };
}

export async function createNewsletterLead(input: CreateNewsletterLeadInput) {
  const { lead, isRepeat } = await upsertLead({
    source: LeadSource.NEWSLETTER,
    email: input.email,
  });

  await createAdminNotifications({
    title: isRepeat ? 'Newsletter subscription refreshed' : 'New newsletter subscriber',
    body: `${lead.email} ${isRepeat ? 'submitted the newsletter form again' : 'subscribed from the landing page updates form'}. Total submissions: ${lead.submissionCount}.`,
  });

  return { ok: true, leadId: lead.id };
}
