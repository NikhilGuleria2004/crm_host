/**
 * DataSeeder.ts
 *
 * Seeds MongoDB with a full demo dataset:
 *  - 1 organization
 *  - 1 dummy user account (owner login)
 *  - 1 sales pipeline with stages
 *  - 5 clients (companies + primary contact each)
 *  - 5 leads
 *  - 6 deals (spread across pipeline stages, incl. one won + one lost)
 *  - Tasks (past/overdue, today, upcoming) -> shows on Calendar
 *  - Activities (calls/emails/meetings, spread across dates) -> shows on Calendar
 *  - Notes attached to companies/contacts/deals
 *  - Tags
 *
 * Place this file at: apps/api/src/scripts/DataSeeder.ts
 * Run it with:         npx tsx src/scripts/DataSeeder.ts   (from apps/api)
 *
 * Requires MongoDB to be reachable at MONGODB_URI (see apps/api/.env).
 * Safe to re-run: it looks up existing records before inserting (idempotent).
 */

import { ObjectId } from 'mongodb';
import { connectDatabase, closeDatabase } from '../db/client';
import { bootstrapIndexes } from '../db/indexes';
import { collections } from '../db/collections';
import { hashPassword } from '../utils/crypto';
import { logger } from '../utils/logger';
import { RoleService } from '../modules/roles/roles.service';
import { RoleRepository } from '../modules/roles/roles.repository';

// ---------------------------------------------------------------------------
// Config: dummy account + organization
// ---------------------------------------------------------------------------

const DUMMY_ACCOUNT = {
  email: 'demo@example.test',
  password: 'Password123!',
  firstName: 'Demo',
  lastName: 'User',
};

const DUMMY_ORG = {
  name: 'Demo Organization',
  slug: 'demo-organization',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  locale: 'en',
};

// ---------------------------------------------------------------------------
// Config: pipeline stages
// ---------------------------------------------------------------------------

const PIPELINE_NAME = 'Sales Pipeline';

const PIPELINE_STAGES = [
  { name: 'New', order: 0, probability: 10, isWon: false, isLost: false },
  { name: 'Qualified', order: 1, probability: 40, isWon: false, isLost: false },
  { name: 'Proposal', order: 2, probability: 70, isWon: false, isLost: false },
  { name: 'Negotiation', order: 3, probability: 90, isWon: false, isLost: false },
  { name: 'Closed Won', order: 4, probability: 100, isWon: true, isLost: false },
  { name: 'Closed Lost', order: 5, probability: 0, isWon: false, isLost: true },
];

// ---------------------------------------------------------------------------
// Config: tags
// ---------------------------------------------------------------------------

const TAGS = [
  { name: 'Enterprise', normalizedName: 'enterprise' },
  { name: 'VIP', normalizedName: 'vip' },
  { name: 'Hot Lead', normalizedName: 'hot lead' },
  { name: 'Renewal', normalizedName: 'renewal' },
];

// ---------------------------------------------------------------------------
// Config: clients (companies + a primary contact each)
// ---------------------------------------------------------------------------

const CLIENTS = [
  {
    company: {
      name: 'Acme Corporation',
      industry: 'Technology',
      employeeCount: 250,
      annualRevenue: 5_000_000,
      website: 'https://acme.example.com',
      email: 'contact@acme.example.com',
      phone: '+1-555-0100',
    },
    contact: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@acme.example.com',
      phone: '+1-555-1001',
      jobTitle: 'Senior Manager',
    },
  },
  {
    company: {
      name: 'Globex Industries',
      industry: 'Finance',
      employeeCount: 1200,
      annualRevenue: 25_000_000,
      website: 'https://globex.example.com',
      email: 'info@globex.example.com',
      phone: '+1-555-0101',
    },
    contact: {
      firstName: 'Sarah',
      lastName: 'Jones',
      email: 'sarah.jones@globex.example.com',
      phone: '+1-555-1002',
      jobTitle: 'Director',
    },
  },
  {
    company: {
      name: 'Initech Solutions',
      industry: 'Software',
      employeeCount: 85,
      annualRevenue: 1_200_000,
      website: 'https://initech.example.com',
      email: 'hello@initech.example.com',
      phone: '+1-555-0102',
    },
    contact: {
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@initech.example.com',
      phone: '+1-555-1003',
      jobTitle: 'CTO',
    },
  },
  {
    company: {
      name: 'Umbrella Corp',
      industry: 'Pharmaceuticals',
      employeeCount: 5000,
      annualRevenue: 100_000_000,
      website: 'https://umbrella.example.com',
      email: 'info@umbrella.example.com',
      phone: '+1-555-0103',
    },
    contact: {
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@umbrella.example.com',
      phone: '+1-555-1004',
      jobTitle: 'VP Sales',
    },
  },
  {
    company: {
      name: 'Stark Industries',
      industry: 'Manufacturing',
      employeeCount: 3000,
      annualRevenue: 75_000_000,
      website: 'https://stark.example.com',
      email: 'contact@stark.example.com',
      phone: '+1-555-0104',
    },
    contact: {
      firstName: 'Michael',
      lastName: 'Wilson',
      email: 'michael.wilson@stark.example.com',
      phone: '+1-555-1005',
      jobTitle: 'Procurement Lead',
    },
  },
];

// ---------------------------------------------------------------------------
// Config: leads (not yet converted to clients)
// ---------------------------------------------------------------------------

const LEADS = [
  { firstName: 'Alice', lastName: 'Martinez', email: 'alice.martinez@techcorp.example.com', phone: '+1-555-2001', companyName: 'TechCorp', source: 'website', status: 'new' as const, score: 72 },
  { firstName: 'Bob', lastName: 'Garcia', email: 'bob.garcia@innovate.example.com', phone: '+1-555-2002', companyName: 'Innovate Inc', source: 'referral', status: 'contacted' as const, score: 65 },
  { firstName: 'Carol', lastName: 'Lee', email: 'carol.lee@future.example.com', phone: '+1-555-2003', companyName: 'Future Labs', source: 'cold_call', status: 'qualified' as const, score: 91 },
  { firstName: 'Daniel', lastName: 'Kim', email: 'daniel.kim@apex.example.com', phone: '+1-555-2004', companyName: 'Apex Systems', source: 'website', status: 'new' as const, score: 45 },
  { firstName: 'Sophia', lastName: 'Patel', email: 'sophia.patel@nexus.example.com', phone: '+1-555-2005', companyName: 'Nexus Group', source: 'social', status: 'unqualified' as const, score: 30 },
];

// ---------------------------------------------------------------------------
// Config: deals (indices refer to CLIENTS array; stageOrder refers to PIPELINE_STAGES)
// ---------------------------------------------------------------------------

const DEALS = [
  { name: 'Acme Enterprise Contract', clientIndex: 0, stageOrder: 3, amount: 2_500_000, probability: 70, expectedCloseDays: 14, status: 'open' as const, source: 'website' },
  { name: 'Globex Expansion Deal', clientIndex: 1, stageOrder: 2, amount: 1_800_000, probability: 50, expectedCloseDays: 30, status: 'open' as const, source: 'referral' },
  { name: 'Initech Cloud Migration', clientIndex: 2, stageOrder: 1, amount: 850_000, probability: 30, expectedCloseDays: 45, status: 'open' as const, source: 'website' },
  { name: 'Umbrella Research License', clientIndex: 3, stageOrder: 4, amount: 5_200_000, probability: 100, expectedCloseDays: -5, status: 'won' as const, source: 'partner' },
  { name: 'Stark Manufacturing Deal', clientIndex: 4, stageOrder: 0, amount: 3_100_000, probability: 15, expectedCloseDays: 60, status: 'open' as const, source: 'cold_call' },
  { name: 'Globex Consulting', clientIndex: 1, stageOrder: 5, amount: 1_200_000, probability: 0, expectedCloseDays: -10, status: 'lost' as const, source: 'website' },
];

// ---------------------------------------------------------------------------
// Config: tasks (dueDays relative to now: negative = overdue, 0 = today, positive = upcoming)
// clientIndex/dealIndex are optional links; -1 means "no link"
// ---------------------------------------------------------------------------

const TASKS = [
  { title: 'Follow up with Acme on contract', description: 'Confirm final terms before signature.', status: 'in_progress' as const, priority: 'high' as const, dueDays: 1, clientIndex: 0, dealIndex: 0 },
  { title: 'Send proposal to Globex', description: 'Prepare and send expansion proposal.', status: 'completed' as const, priority: 'high' as const, dueDays: -2, clientIndex: 1, dealIndex: 1 },
  { title: 'Schedule demo for Initech', description: 'Coordinate cloud migration demo.', status: 'open' as const, priority: 'medium' as const, dueDays: 3, clientIndex: 2, dealIndex: 2 },
  { title: 'Review Umbrella renewal terms', description: 'Finalize research license renewal.', status: 'open' as const, priority: 'urgent' as const, dueDays: 0, clientIndex: 3, dealIndex: 3 },
  { title: 'Prepare Stark contract draft', description: 'Draft manufacturing deal contract.', status: 'open' as const, priority: 'urgent' as const, dueDays: 5, clientIndex: 4, dealIndex: 4 },
  { title: 'Call Alice Martinez (lead)', description: 'Initial qualification call.', status: 'open' as const, priority: 'medium' as const, dueDays: 2, clientIndex: -1, dealIndex: -1 },
  { title: 'Update CRM records', description: 'Ensure all client info is current.', status: 'open' as const, priority: 'low' as const, dueDays: 7, clientIndex: -1, dealIndex: -1 },
  { title: 'Quarterly business review prep', description: 'Prepare slides for QBR.', status: 'cancelled' as const, priority: 'low' as const, dueDays: -10, clientIndex: -1, dealIndex: -1 },
];

// ---------------------------------------------------------------------------
// Config: activities (occurredDays relative to now: positive = in the past)
// ---------------------------------------------------------------------------

const ACTIVITIES = [
  { type: 'call' as const, subject: 'Discovery call with Acme', description: 'Discussed requirements for enterprise contract.', occurredDaysAgo: 6, durationMinutes: 30, clientIndex: 0, dealIndex: 0 },
  { type: 'email' as const, subject: 'Proposal sent to Globex', description: 'Sent detailed proposal for expansion deal.', occurredDaysAgo: 5, durationMinutes: 0, clientIndex: 1, dealIndex: 1 },
  { type: 'meeting' as const, subject: 'Demo with Initech', description: 'Product demonstration for cloud migration.', occurredDaysAgo: 4, durationMinutes: 60, clientIndex: 2, dealIndex: 2 },
  { type: 'note' as const, subject: 'Umbrella follow-up', description: 'Research license terms agreed.', occurredDaysAgo: 3, durationMinutes: 0, clientIndex: 3, dealIndex: 3 },
  { type: 'call' as const, subject: 'Stark kickoff call', description: 'Initial call to discuss manufacturing deal.', occurredDaysAgo: 2, durationMinutes: 45, clientIndex: 4, dealIndex: 4 },
  { type: 'demo' as const, subject: 'Follow-up demo for Acme', description: 'Second demo covering integrations.', occurredDaysAgo: 1, durationMinutes: 45, clientIndex: 0, dealIndex: 0 },
  { type: 'follow_up' as const, subject: 'Globex consulting wrap-up', description: 'Deal lost due to budget constraints.', occurredDaysAgo: 0, durationMinutes: 15, clientIndex: 1, dealIndex: 5 },
  { type: 'meeting' as const, subject: 'Upcoming: Stark contract review', description: 'Scheduled legal review meeting.', occurredDaysAgo: -3, durationMinutes: 90, clientIndex: 4, dealIndex: 4 },
];

// ---------------------------------------------------------------------------
// Config: notes
// ---------------------------------------------------------------------------

const NOTES = [
  { title: 'Acme requirements', body: 'Customer requires SSO and audit logs for enterprise contract.', clientIndex: 0, dealIndex: 0 },
  { title: 'Globex budget notes', body: 'Budget constrained. Proposal adjusted to fit.', clientIndex: 1, dealIndex: 1 },
  { title: 'Initech tech stack', body: 'Using Kubernetes and React. Cloud migration preferred.', clientIndex: 2, dealIndex: 2 },
  { title: 'Umbrella compliance', body: 'Requires compliance documentation before renewal.', clientIndex: 3, dealIndex: 3 },
  { title: 'Stark timeline', body: 'Needs delivery by end of quarter.', clientIndex: 4, dealIndex: 4 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function daysFromNow(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  await connectDatabase();
  await bootstrapIndexes();
  logger.info('Connected to database, starting DataSeeder');

  const now = new Date();

  // 1. Organization ----------------------------------------------------------
  const organizations = collections.organizations();
  let org = await organizations.findOne({ slug: DUMMY_ORG.slug });
  if (!org) {
    const result = await organizations.insertOne({
      name: DUMMY_ORG.name,
      slug: DUMMY_ORG.slug,
      timezone: DUMMY_ORG.timezone,
      currency: DUMMY_ORG.currency,
      locale: DUMMY_ORG.locale,
      settings: { dateFormat: 'dd/MM/yyyy', fiscalYearStartMonth: 4 },
      status: 'active',
      createdAt: now,
      updatedAt: now,
    } as any);
    org = await organizations.findOne({ _id: result.insertedId });
    logger.info({ org: DUMMY_ORG.name }, 'Created organization');
  } else {
    logger.info({ org: org.name }, 'Organization already exists, reusing');
  }
  const orgId = org!._id;

  // 2. Default roles + dummy user account -------------------------------------
  const roleService = new RoleService(new RoleRepository());
  await roleService.seedDefaultRoles(orgId.toHexString());
  const ownerRole = await collections.roles().findOne({ organizationId: orgId, name: 'Owner' });
  if (!ownerRole) {
    throw new Error('Failed to seed default "Owner" role');
  }

  const users = collections.users();
  let user = await users.findOne({ organizationId: orgId, emailNormalized: normalize(DUMMY_ACCOUNT.email) });
  if (!user) {
    const passwordHash = await hashPassword(DUMMY_ACCOUNT.password);
    const result = await users.insertOne({
      organizationId: orgId,
      email: DUMMY_ACCOUNT.email,
      emailNormalized: normalize(DUMMY_ACCOUNT.email),
      passwordHash,
      firstName: DUMMY_ACCOUNT.firstName,
      lastName: DUMMY_ACCOUNT.lastName,
      status: 'active',
      roleIds: [ownerRole._id],
      teamIds: [],
      preferences: {},
      createdAt: now,
      updatedAt: now,
    } as any);
    user = await users.findOne({ _id: result.insertedId });
    logger.info({ email: DUMMY_ACCOUNT.email }, 'Created dummy user account');
  } else {
    logger.info({ email: DUMMY_ACCOUNT.email }, 'Dummy user already exists, reusing');
  }
  const userId = user!._id;

  const memberships = collections.organizationMemberships();
  const existingMembership = await memberships.findOne({ organizationId: orgId, userId });
  if (!existingMembership) {
    await memberships.insertOne({
      userId,
      organizationId: orgId,
      roleId: ownerRole._id,
      teamIds: [],
      status: 'active',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  // 3. Tags --------------------------------------------------------------------
  const tagCollection = collections.tags();
  const tagIds: ObjectId[] = [];
  for (const tag of TAGS) {
    let existing = await tagCollection.findOne({ organizationId: orgId, normalizedName: tag.normalizedName });
    if (!existing) {
      const result = await tagCollection.insertOne({
        organizationId: orgId,
        name: tag.name,
        normalizedName: tag.normalizedName,
        createdAt: now,
      } as any);
      existing = await tagCollection.findOne({ _id: result.insertedId });
    }
    tagIds.push(existing!._id);
  }

  // 4. Pipeline + stages ---------------------------------------------------------
  const pipelineCollection = collections.pipelines();
  let pipeline = await pipelineCollection.findOne({ organizationId: orgId, name: PIPELINE_NAME });
  if (!pipeline) {
    const result = await pipelineCollection.insertOne({
      organizationId: orgId,
      name: PIPELINE_NAME,
      description: 'Default sales pipeline',
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    } as any);
    pipeline = await pipelineCollection.findOne({ _id: result.insertedId });
  }
  const pipelineId = pipeline!._id;

  const pipelineStageCollection = collections.pipelineStages();
  const stageIdsByOrder = new Map<number, ObjectId>();
  for (const stage of PIPELINE_STAGES) {
    let existing = await pipelineStageCollection.findOne({ organizationId: orgId, pipelineId, name: stage.name });
    if (!existing) {
      const result = await pipelineStageCollection.insertOne({
        organizationId: orgId,
        pipelineId,
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        isWon: stage.isWon,
        isLost: stage.isLost,
        createdAt: now,
        updatedAt: now,
      } as any);
      existing = await pipelineStageCollection.findOne({ _id: result.insertedId });
    }
    stageIdsByOrder.set(stage.order, existing!._id);
  }

  // 5. Clients: companies + primary contacts --------------------------------------
  const companyCollection = collections.companies();
  const contactCollection = collections.contacts();
  const companyIds: ObjectId[] = [];
  const contactIds: ObjectId[] = [];

  for (let i = 0; i < CLIENTS.length; i++) {
    const client = CLIENTS[i];
    const normalizedName = normalize(client.company.name);

    let company = await companyCollection.findOne({ organizationId: orgId, normalizedName });
    if (!company) {
      const result = await companyCollection.insertOne({
        organizationId: orgId,
        name: client.company.name,
        normalizedName,
        website: client.company.website,
        email: client.company.email,
        phone: client.company.phone,
        industry: client.company.industry,
        employeeCount: client.company.employeeCount,
        annualRevenue: client.company.annualRevenue,
        ownerId: userId,
        status: 'active',
        tags: [tagIds[i % tagIds.length]],
        customFields: {},
        description: `${client.company.name} is a client in the ${client.company.industry} sector.`,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      } as any);
      company = await companyCollection.findOne({ _id: result.insertedId });
    }
    companyIds.push(company!._id);

    const contactEmailNormalized = normalize(client.contact.email);
    let contact = await contactCollection.findOne({ organizationId: orgId, emailNormalized: contactEmailNormalized });
    if (!contact) {
      const result = await contactCollection.insertOne({
        organizationId: orgId,
        firstName: client.contact.firstName,
        lastName: client.contact.lastName,
        email: client.contact.email,
        emailNormalized: contactEmailNormalized,
        phone: client.contact.phone,
        companyId: company!._id,
        jobTitle: client.contact.jobTitle,
        ownerId: userId,
        status: 'active',
        source: 'seed',
        tags: [],
        customFields: {},
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      } as any);
      contact = await contactCollection.findOne({ _id: result.insertedId });
    }
    contactIds.push(contact!._id);
  }

  // 6. Leads ------------------------------------------------------------------------
  const leadCollection = collections.leads();
  for (const lead of LEADS) {
    const emailNormalized = normalize(lead.email);
    const existing = await leadCollection.findOne({ organizationId: orgId, emailNormalized });
    if (!existing) {
      await leadCollection.insertOne({
        organizationId: orgId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        emailNormalized,
        phone: lead.phone,
        companyName: lead.companyName,
        source: lead.source,
        status: lead.status,
        ownerId: userId,
        score: lead.score,
        tags: [tagIds[2]], // "Hot Lead"
        customFields: {},
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  }

  // 7. Deals ------------------------------------------------------------------------
  const dealCollection = collections.deals();
  const dealIds: (ObjectId | null)[] = [];
  for (const deal of DEALS) {
    let existing = await dealCollection.findOne({ organizationId: orgId, name: deal.name });
    if (!existing) {
      const stageId = stageIdsByOrder.get(deal.stageOrder)!;
      const expectedCloseDate = daysFromNow(now, deal.expectedCloseDays);
      const result = await dealCollection.insertOne({
        organizationId: orgId,
        name: deal.name,
        pipelineId,
        stageId,
        companyId: companyIds[deal.clientIndex],
        contactId: contactIds[deal.clientIndex],
        ownerId: userId,
        amount: deal.amount,
        currency: DUMMY_ORG.currency,
        probability: deal.probability,
        expectedCloseDate,
        source: deal.source,
        status: deal.status,
        lostReason: deal.status === 'lost' ? 'Budget unavailable' : undefined,
        customFields: {},
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
        wonAt: deal.status === 'won' ? expectedCloseDate : undefined,
        lostAt: deal.status === 'lost' ? expectedCloseDate : undefined,
      } as any);
      existing = await dealCollection.findOne({ _id: result.insertedId });
    }
    dealIds.push(existing!._id);
  }

  // 8. Tasks (feed the Calendar view) ------------------------------------------------
  const taskCollection = collections.tasks();
  for (const task of TASKS) {
    const existing = await taskCollection.findOne({ organizationId: orgId, title: task.title, assignedTo: userId });
    if (!existing) {
      await taskCollection.insertOne({
        organizationId: orgId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: daysFromNow(now, task.dueDays),
        assignedTo: userId,
        contactId: task.clientIndex >= 0 ? contactIds[task.clientIndex] : undefined,
        companyId: task.clientIndex >= 0 ? companyIds[task.clientIndex] : undefined,
        dealId: task.dealIndex >= 0 ? dealIds[task.dealIndex]! : undefined,
        completedAt: task.status === 'completed' ? daysFromNow(now, task.dueDays) : undefined,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  }

  // 9. Activities (also feed the Calendar view) --------------------------------------
  const activityCollection = collections.activities();
  for (const activity of ACTIVITIES) {
    const existing = await activityCollection.findOne({ organizationId: orgId, subject: activity.subject });
    if (!existing) {
      await activityCollection.insertOne({
        organizationId: orgId,
        type: activity.type,
        subject: activity.subject,
        description: activity.description,
        occurredAt: daysFromNow(now, -activity.occurredDaysAgo),
        durationMinutes: activity.durationMinutes,
        ownerId: userId,
        contactId: activity.clientIndex >= 0 ? contactIds[activity.clientIndex] : undefined,
        companyId: activity.clientIndex >= 0 ? companyIds[activity.clientIndex] : undefined,
        dealId: activity.dealIndex >= 0 ? dealIds[activity.dealIndex]! : undefined,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  }

  // 10. Notes -------------------------------------------------------------------------
  const noteCollection = collections.notes();
  for (const note of NOTES) {
    const existing = await noteCollection.findOne({ organizationId: orgId, title: note.title });
    if (!existing) {
      await noteCollection.insertOne({
        organizationId: orgId,
        title: note.title,
        body: note.body,
        authorId: userId,
        contactId: note.clientIndex >= 0 ? contactIds[note.clientIndex] : undefined,
        companyId: note.clientIndex >= 0 ? companyIds[note.clientIndex] : undefined,
        dealId: note.dealIndex >= 0 ? dealIds[note.dealIndex]! : undefined,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  }

  logger.info(
    {
      organization: DUMMY_ORG.name,
      clients: CLIENTS.length,
      leads: LEADS.length,
      deals: DEALS.length,
      tasks: TASKS.length,
      activities: ACTIVITIES.length,
      notes: NOTES.length,
      tags: TAGS.length,
    },
    'DataSeeder completed',
  );

  console.log('\n=== Dummy Account ===');
  console.log(`  ${DUMMY_ACCOUNT.email} / ${DUMMY_ACCOUNT.password}`);
  console.log('======================');
  console.log(`\nSeeded into "${DUMMY_ORG.name}":`);
  console.log(`  ${CLIENTS.length} clients (companies + contacts)`);
  console.log(`  ${LEADS.length} leads`);
  console.log(`  ${DEALS.length} deals (across pipeline stages)`);
  console.log(`  ${TASKS.length} tasks (overdue / today / upcoming -> Calendar)`);
  console.log(`  ${ACTIVITIES.length} activities (past + upcoming -> Calendar)`);
  console.log(`  ${NOTES.length} notes`);
  console.log(`  ${TAGS.length} tags\n`);
}

seed()
  .then(async () => {
    await closeDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'DataSeeder failed');
    console.error('DataSeeder failed:', error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });