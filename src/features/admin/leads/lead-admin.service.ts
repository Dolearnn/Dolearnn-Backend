import { LeadSource, LeadStatus } from '@prisma/client';
import { AppError } from '../../../lib/http';
import { prisma } from '../../../lib/prisma';
import type {
  ListLeadsQueryInput,
  UpdateLeadStatusInput,
} from './lead-admin.schemas';

function buildLeadWhere(input: ListLeadsQueryInput) {
  const search = input.search?.trim();

  return {
    ...(input.source ? { source: input.source } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { userType: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
}

export async function listLeads(input: ListLeadsQueryInput) {
  const where = buildLeadWhere(input);
  const skip = (input.page - 1) * input.pageSize;

  const [leads, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      orderBy: [{ lastSubmittedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: input.pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    filters: {
      sources: Object.values(LeadSource),
      statuses: Object.values(LeadStatus),
    },
  };
}

export async function updateLeadStatus(
  leadId: string,
  input: UpdateLeadStatusInput,
) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new AppError(404, 'Lead not found');
  }

  return prisma.lead.update({
    where: { id: leadId },
    data: { status: input.status },
  });
}
