import { connectDatabase, getDatabase } from '../db/client';
import { bootstrapIndexes } from '../db/indexes';
import { collections } from '../db/collections';
import { ObjectId } from 'mongodb';
import { hashPassword } from '../utils/crypto';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { RoleService } from '../modules/roles/roles.service';
import { RoleRepository } from '../modules/roles/roles.repository';

const DEMO_USERS = [
  { email: 'owner@example.test', password: 'Password123!', firstName: 'Owner', lastName: 'User', roleKey: 'owner' },
  { email: 'admin@example.test', password: 'Password123!', firstName: 'Admin', lastName: 'User', roleKey: 'administrator' },
  { email: 'manager@example.test', password: 'Password123!', firstName: 'Manager', lastName: 'User', roleKey: 'sales_manager' },
  { email: 'sales@example.test', password: 'Password123!', firstName: 'Sales', lastName: 'Rep', roleKey: 'sales_representative' },
  { email: 'support@example.test', password: 'Password123!', firstName: 'Support', lastName: 'Agent', roleKey: 'support_agent' },
  { email: 'viewer@example.test', password: 'Password123!', firstName: 'Viewer', lastName: 'User', roleKey: 'viewer' },
];

const COMPANIES = [
  { name: 'Acme Corporation', normalizedName: 'acme corporation', industry: 'Technology', employeeCount: 250, annualRevenue: 5000000, website: 'https://acme.example.com', email: 'contact@acme.example.com', phone: '+1-555-0100', status: 'active' },
  { name: 'Globex Industries', normalizedName: 'globex industries', industry: 'Finance', employeeCount: 1200, annualRevenue: 25000000, website: 'https://globex.example.com', email: 'info@globex.example.com', phone: '+1-555-0101', status: 'active' },
  { name: 'Initech Solutions', normalizedName: 'initech solutions', industry: 'Software', employeeCount: 85, annualRevenue: 1200000, website: 'https://initech.example.com', email: 'hello@initech.example.com', phone: '+1-555-0102', status: 'active' },
  { name: 'Umbrella Corp', normalizedName: 'umbrella corp', industry: 'Pharmaceuticals', employeeCount: 5000, annualRevenue: 100000000, website: 'https://umbrella.example.com', email: 'info@umbrella.example.com', phone: '+1-555-0103', status: 'active' },
  { name: 'Stark Industries', normalizedName: 'stark industries', industry: 'Manufacturing', employeeCount: 3000, annualRevenue: 75000000, website: 'https://stark.example.com', email: 'contact@stark.example.com', phone: '+1-555-0104', status: 'active' },
];

const CONTACTS = [
  { firstName: 'John', lastName: 'Smith', email: 'john.smith@acme.example.com', phone: '+1-555-1001', jobTitle: 'Senior Manager', companyIndex: 0, ownerKey: 'sales_representative', status: 'active', source: 'website' },
  { firstName: 'Sarah', lastName: 'Jones', email: 'sarah.jones@globex.example.com', phone: '+1-555-1002', jobTitle: 'Director', companyIndex: 1, ownerKey: 'sales_representative', status: 'active', source: 'referral' },
  { firstName: 'David', lastName: 'Brown', email: 'david.brown@initech.example.com', phone: '+1-555-1003', jobTitle: 'CTO', companyIndex: 2, ownerKey: 'sales_manager', status: 'active', source: 'website' },
  { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@umbrella.example.com', phone: '+1-555-1004', jobTitle: 'VP Sales', companyIndex: 3, ownerKey: 'sales_representative', status: 'active', source: 'cold_call' },
  { firstName: 'Michael', lastName: 'Wilson', email: 'michael.wilson@stark.example.com', phone: '+1-555-1005', jobTitle: 'Procurement Lead', companyIndex: 4, ownerKey: 'sales_manager', status: 'active', source: 'website' },
  { firstName: 'Jessica', lastName: 'Taylor', email: 'jessica.taylor@acme.example.com', phone: '+1-555-1006', jobTitle: 'Account Executive', companyIndex: 0, ownerKey: 'sales_representative', status: 'active', source: 'import' },
  { firstName: 'Ryan', lastName: 'Anderson', email: 'ryan.anderson@globex.example.com', phone: '+1-555-1007', jobTitle: 'Analyst', companyIndex: 1, ownerKey: 'support_agent', status: 'inactive', source: 'website' },
  { firstName: 'Laura', lastName: 'Thomas', email: 'laura.thomas@initech.example.com', phone: '+1-555-1008', jobTitle: 'Product Manager', companyIndex: 2, ownerKey: 'sales_representative', status: 'active', source: 'partner' },
  { firstName: 'Kevin', lastName: 'Jackson', email: 'kevin.jackson@umbrella.example.com', phone: '+1-555-1009', jobTitle: 'Research Lead', companyIndex: 3, ownerKey: 'sales_manager', status: 'active', source: 'email' },
  { firstName: 'Amanda', lastName: 'White', email: 'amanda.white@stark.example.com', phone: '+1-555-1010', jobTitle: 'Sales Director', companyIndex: 4, ownerKey: 'sales_representative', status: 'active', source: 'website' },
  { firstName: 'Chris', lastName: 'Harris', email: 'chris.harris@acme.example.com', phone: '+1-555-1011', jobTitle: 'Engineer', companyIndex: 0, ownerKey: 'support_agent', status: 'active', source: 'website' },
  { firstName: 'Rachel', lastName: 'Clark', email: 'rachel.clark@globex.example.com', phone: '+1-555-1012', jobTitle: 'CFO', companyIndex: 1, ownerKey: 'sales_manager', status: 'active', source: 'referral' },
  { firstName: 'Brian', lastName: 'Lewis', email: 'brian.lewis@initech.example.com', phone: '+1-555-1013', jobTitle: 'Developer', companyIndex: 2, ownerKey: 'sales_representative', status: 'active', source: 'social' },
  { firstName: 'Nicole', lastName: 'Robinson', email: 'nicole.robinson@umbrella.example.com', phone: '+1-555-1014', jobTitle: 'Marketing Lead', companyIndex: 3, ownerKey: 'sales_representative', status: 'active', source: 'advertisement' },
  { firstName: 'Jason', lastName: 'Walker', email: 'jason.walker@stark.example.com', phone: '+1-555-1015', jobTitle: 'Operations', companyIndex: 4, ownerKey: 'support_agent', status: 'inactive', source: 'website' },
];

const LEADS = [
  { firstName: 'Alice', lastName: 'Martinez', email: 'alice.martinez@techcorp.example.com', phone: '+1-555-2001', companyName: 'TechCorp', source: 'website', status: 'new', score: 72, ownerKey: 'sales_representative' },
  { firstName: 'Bob', lastName: 'Garcia', email: 'bob.garcia@innovate.example.com', phone: '+1-555-2002', companyName: 'Innovate Inc', source: 'referral', status: 'contacted', score: 65, ownerKey: 'sales_manager' },
  { firstName: 'Carol', lastName: 'Lee', email: 'carol.lee@future.example.com', phone: '+1-555-2003', companyName: 'Future Labs', source: 'cold_call', status: 'qualified', score: 91, ownerKey: 'sales_representative' },
  { firstName: 'Daniel', lastName: 'Kim', email: 'daniel.kim@apex.example.com', phone: '+1-555-2004', companyName: 'Apex Systems', source: 'website', status: 'new', score: 45, ownerKey: 'sales_representative' },
  { firstName: 'Sophia', lastName: 'Patel', email: 'sophia.patel@nexus.example.com', phone: '+1-555-2005', companyName: 'Nexus Group', source: 'social', status: 'qualified', score: 88, ownerKey: 'sales_manager' },
  { firstName: 'James', lastName: 'Wright', email: 'james.wright@vanguard.example.com', phone: '+1-555-2006', companyName: 'Vanguard', source: 'email', status: 'unqualified', score: 30, ownerKey: 'sales_representative' },
  { firstName: 'Olivia', lastName: 'Scott', email: 'olivia.scott@horizon.example.com', phone: '+1-555-2007', companyName: 'Horizon', source: 'website', status: 'contacted', score: 55, ownerKey: 'sales_representative' },
  { firstName: 'William', lastName: 'Adams', email: 'william.adams@summit.example.com', phone: '+1-555-2008', companyName: 'Summit Corp', source: 'partner', status: 'new', score: 68, ownerKey: 'sales_manager' },
];

const PIPELINE_STAGES = [
  { name: 'New', order: 0, probability: 10, isWon: false, isLost: false },
  { name: 'Qualified', order: 1, probability: 40, isWon: false, isLost: false },
  { name: 'Proposal', order: 2, probability: 70, isWon: false, isLost: false },
  { name: 'Negotiation', order: 3, probability: 90, isWon: false, isLost: false },
  { name: 'Closed Won', order: 4, probability: 100, isWon: true, isLost: false },
  { name: 'Closed Lost', order: 5, probability: 0, isWon: false, isLost: true },
];

const DEALS = [
  { name: 'Acme Enterprise Contract', companyIndex: 0, contactIndex: 0, stageOrder: 3, ownerKey: 'sales_representative', amount: 2500000, currency: 'INR', probability: 70, expectedCloseDays: 14, status: 'open', source: 'website' },
  { name: 'Globex Expansion Deal', companyIndex: 1, contactIndex: 1, stageOrder: 2, ownerKey: 'sales_manager', amount: 1800000, currency: 'INR', probability: 50, expectedCloseDays: 30, status: 'open', source: 'referral' },
  { name: 'Initech Cloud Migration', companyIndex: 2, contactIndex: 2, stageOrder: 1, ownerKey: 'sales_representative', amount: 850000, currency: 'INR', probability: 30, expectedCloseDays: 45, status: 'open', source: 'website' },
  { name: 'Umbrella Research License', companyIndex: 3, contactIndex: 3, stageOrder: 4, ownerKey: 'sales_manager', amount: 5200000, currency: 'INR', probability: 100, expectedCloseDays: -5, status: 'won', source: 'partner' },
  { name: 'Stark Manufacturing Deal', companyIndex: 4, contactIndex: 4, stageOrder: 0, ownerKey: 'sales_representative', amount: 3100000, currency: 'INR', probability: 15, expectedCloseDays: 60, status: 'open', source: 'cold_call' },
  { name: 'Acme Support Renewal', companyIndex: 0, contactIndex: 5, stageOrder: 3, ownerKey: 'sales_representative', amount: 450000, currency: 'INR', probability: 85, expectedCloseDays: 7, status: 'open', source: 'email' },
  { name: 'Globex Consulting', companyIndex: 1, contactIndex: 6, stageOrder: 5, ownerKey: 'sales_manager', amount: 1200000, currency: 'INR', probability: 0, expectedCloseDays: -10, status: 'lost', source: 'website' },
  { name: 'Initech Training Package', companyIndex: 2, contactIndex: 7, stageOrder: 2, ownerKey: 'sales_representative', amount: 320000, currency: 'INR', probability: 60, expectedCloseDays: 21, status: 'open', source: 'social' },
  { name: 'Umbrella Safety Audit', companyIndex: 3, contactIndex: 8, stageOrder: 1, ownerKey: 'sales_representative', amount: 780000, currency: 'INR', probability: 25, expectedCloseDays: 40, status: 'open', source: 'website' },
  { name: 'Stark R&D Partnership', companyIndex: 4, contactIndex: 9, stageOrder: 3, ownerKey: 'sales_manager', amount: 4100000, currency: 'INR', probability: 75, expectedCloseDays: 18, status: 'open', source: 'partner' },
];

const ACTIVITIES = [
  { type: 'call', subject: 'Discovery call with Acme', description: 'Discussed requirements for enterprise contract.', occurredDays: 0, durationMinutes: 30, contactIndex: 0, companyIndex: 0, dealIndex: 0, ownerKey: 'sales_representative' },
  { type: 'email', subject: 'Proposal sent to Globex', description: 'Sent detailed proposal for expansion deal.', occurredDays: 1, durationMinutes: 0, contactIndex: 1, companyIndex: 1, dealIndex: 1, ownerKey: 'sales_manager' },
  { type: 'meeting', subject: 'Demo with Initech', description: 'Product demonstration for cloud migration.', occurredDays: 2, durationMinutes: 60, contactIndex: 2, companyIndex: 2, dealIndex: 2, ownerKey: 'sales_representative' },
  { type: 'note', subject: 'Umbrella follow-up', description: 'Research license terms agreed.', occurredDays: 3, durationMinutes: 0, contactIndex: 3, companyIndex: 3, dealIndex: 3, ownerKey: 'sales_manager' },
  { type: 'call', subject: 'Stark kickoff', description: 'Initial call to discuss manufacturing deal.', occurredDays: 4, durationMinutes: 45, contactIndex: 4, companyIndex: 4, dealIndex: 4, ownerKey: 'sales_representative' },
  { type: 'meeting', subject: 'Contract review', description: 'Legal review of Acme contract.', occurredDays: 5, durationMinutes: 90, contactIndex: 5, companyIndex: 0, dealIndex: 5, ownerKey: 'sales_representative' },
  { type: 'email', subject: 'Globex rejection', description: 'Deal lost due to budget constraints.', occurredDays: 6, durationMinutes: 0, contactIndex: 6, companyIndex: 1, dealIndex: 6, ownerKey: 'sales_manager' },
  { type: 'demo', subject: 'Initech training demo', description: 'Showcased training package features.', occurredDays: 7, durationMinutes: 45, contactIndex: 7, companyIndex: 2, dealIndex: 7, ownerKey: 'sales_representative' },
  { type: 'follow_up', subject: 'Umbrella safety check', description: 'Follow-up on safety audit requirements.', occurredDays: 8, durationMinutes: 15, contactIndex: 8, companyIndex: 3, dealIndex: 8, ownerKey: 'sales_representative' },
  { type: 'call', subject: 'Stark R&D discussion', description: 'Discussed partnership terms.', occurredDays: 9, durationMinutes: 60, contactIndex: 9, companyIndex: 4, dealIndex: 9, ownerKey: 'sales_manager' },
  { type: 'other', subject: 'Quarterly review', description: 'Internal quarterly business review.', occurredDays: 10, durationMinutes: 120, ownerKey: 'sales_manager' },
  { type: 'call', subject: 'Acme renewal call', description: 'Support renewal discussion.', occurredDays: 11, durationMinutes: 20, contactIndex: 0, companyIndex: 0, dealIndex: 5, ownerKey: 'sales_representative' },
];

const TASKS = [
  { title: 'Send proposal to Globex', description: 'Prepare and send expansion proposal.', status: 'completed', priority: 'high', dueDays: -2, assignedToKey: 'sales_manager', contactIndex: 1, companyIndex: 1, dealIndex: 1 },
  { title: 'Follow up with Acme', description: 'Follow up on enterprise contract.', status: 'in_progress', priority: 'high', dueDays: 1, assignedToKey: 'sales_representative', contactIndex: 0, companyIndex: 0, dealIndex: 0 },
  { title: 'Schedule demo for Initech', description: 'Coordinate cloud migration demo.', status: 'open', priority: 'medium', dueDays: 3, assignedToKey: 'sales_representative', contactIndex: 2, companyIndex: 2, dealIndex: 2 },
  { title: 'Prepare Stark contract', description: 'Draft manufacturing deal contract.', status: 'open', priority: 'urgent', dueDays: 5, assignedToKey: 'sales_manager', contactIndex: 4, companyIndex: 4, dealIndex: 4 },
  { title: 'Update CRM records', description: 'Ensure all contact info is current.', status: 'open', priority: 'low', dueDays: 7, assignedToKey: 'sales_representative', contactIndex: 0, companyIndex: 0 },
  { title: 'Review Umbrella terms', description: 'Finalize research license terms.', status: 'completed', priority: 'high', dueDays: -5, assignedToKey: 'sales_manager', contactIndex: 3, companyIndex: 3, dealIndex: 3 },
  { title: 'Call Horizon lead', description: 'Reach out to Horizon contact.', status: 'open', priority: 'medium', dueDays: 4, assignedToKey: 'sales_representative', contactIndex: 6, companyIndex: -1 },
  { title: 'Submit expense report', description: 'Submit Q3 expenses.', status: 'cancelled', priority: 'low', dueDays: -10, assignedToKey: 'sales_representative' },
];

const NOTES = [
  { title: 'Acme requirements', body: 'Customer requires SSO and audit logs for enterprise contract.', contactIndex: 0, companyIndex: 0, dealIndex: 0 },
  { title: 'Globex budget notes', body: 'Budget constrained to $2M. Proposal adjusted.', contactIndex: 1, companyIndex: 1, dealIndex: 1 },
  { title: 'Initech tech stack', body: 'Using Kubernetes and React. Cloud migration preferred.', contactIndex: 2, companyIndex: 2, dealIndex: 2 },
  { title: 'Umbrella compliance', body: 'Requires FDA compliance documentation.', contactIndex: 3, companyIndex: 3, dealIndex: 3 },
  { title: 'Stark timeline', body: 'Needs delivery by end of Q4.', contactIndex: 4, companyIndex: 4, dealIndex: 4 },
  { title: 'Acme renewal terms', body: 'Support renewal at current pricing for 2 years.', contactIndex: 5, companyIndex: 0, dealIndex: 5 },
];

const TAGS = [
  { name: 'Enterprise', normalizedName: 'enterprise' },
  { name: 'VIP', normalizedName: 'vip' },
  { name: 'Hot Lead', normalizedName: 'hot lead' },
  { name: 'Renewal', normalizedName: 'renewal' },
  { name: 'Partner', normalizedName: 'partner' },
  { name: 'High Value', normalizedName: 'high value' },
];

async function seed() {
  try {
    await connectDatabase();
    await bootstrapIndexes();
    const db = getDatabase();
    const dbName = db.databaseName || env.MONGODB_DATABASE;
    logger.info({ database: dbName }, 'Starting seed');

    const roleService = new RoleService(new RoleRepository());

    const organizationCollection = collections.organizations();
    let organization = await organizationCollection.findOne({});
    if (!organization) {
      const result = await organizationCollection.insertOne({
        name: 'Acme Corporation',
        slug: 'acme-corp',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        locale: 'en',
        settings: {
          dateFormat: 'DD/MM/YYYY',
          fiscalYearStartMonth: 4,
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      organization = await organizationCollection.findOne({ _id: result.insertedId });
      logger.info('Created organization: Acme Corporation');
    } else {
      logger.info({ name: organization.name }, 'Using existing organization');
    }

    const orgId = organization!._id.toHexString();
    await roleService.seedDefaultRoles(orgId);
    const roleMap = new Map<string, string>();
    const roles = await collections.roles().find({ organizationId: new ObjectId(orgId) }).toArray();
    for (const role of roles) {
      roleMap.set(role.name, role._id.toHexString());
    }

    const teamCollection = collections.teams();
    const northTeam = await teamCollection.findOne({ organizationId: new ObjectId(orgId), name: 'North Team' });
    const northTeamId = northTeam ? northTeam._id.toHexString() : (await teamCollection.insertOne({
      organizationId: new ObjectId(orgId),
      name: 'North Team',
      description: 'North sales team',
      memberIds: [],
      managerIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)).insertedId.toHexString();

    const southTeam = await teamCollection.findOne({ organizationId: new ObjectId(orgId), name: 'South Team' });
    const southTeamId = southTeam ? southTeam._id.toHexString() : (await teamCollection.insertOne({
      organizationId: new ObjectId(orgId),
      name: 'South Team',
      description: 'South sales team',
      memberIds: [],
      managerIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)).insertedId.toHexString();

    const userRoleMap = new Map<string, { id: string; roleId: string; teamId: string }>();
    const usersCollection = collections.users();
    const now = new Date();

    for (const demoUser of DEMO_USERS) {
      const existing = await usersCollection.findOne({ organizationId: new ObjectId(orgId), emailNormalized: demoUser.email.toLowerCase().trim() });
      if (existing) {
        userRoleMap.set(demoUser.roleKey, { id: existing._id.toHexString(), roleId: existing.roleIds[0].toHexString(), teamId: existing.teamIds[0]?.toHexString() || '' });
        logger.info({ email: demoUser.email }, 'User already exists');
        continue;
      }

      const passwordHash = await hashPassword(demoUser.password);
      const roleId = roleMap.get(demoUser.roleKey)!;
      const teamId = demoUser.roleKey === 'owner' || demoUser.roleKey === 'administrator' || demoUser.roleKey === 'viewer' ? '' : (demoUser.roleKey === 'sales_manager' ? northTeamId : southTeamId);
      const result = await usersCollection.insertOne({
        organizationId: new ObjectId(orgId),
        email: demoUser.email,
        emailNormalized: demoUser.email.toLowerCase().trim(),
        passwordHash,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        status: 'active',
        roleIds: [new ObjectId(roleId)],
        teamIds: teamId ? [new ObjectId(teamId)] : [],
        preferences: {},
        createdAt: now,
        updatedAt: now,
      } as any);
      const userId = result.insertedId.toHexString();
      userRoleMap.set(demoUser.roleKey, { id: userId, roleId, teamId });
      logger.info({ email: demoUser.email, role: demoUser.roleKey }, 'Seeded user');
    }

    const tagCollection = collections.tags();
    const tagIds: string[] = [];
    for (const tag of TAGS) {
      const existing = await tagCollection.findOne({ organizationId: new ObjectId(orgId), normalizedName: tag.normalizedName });
      if (existing) {
        tagIds.push(existing._id.toHexString());
      } else {
        const result = await tagCollection.insertOne({
          organizationId: new ObjectId(orgId),
          name: tag.name,
          normalizedName: tag.normalizedName,
          createdAt: now,
        } as any);
        tagIds.push(result.insertedId.toHexString());
      }
    }

    const pipelineCollection = collections.pipelines();
    const pipeline = await pipelineCollection.findOne({ organizationId: new ObjectId(orgId), name: 'Sales Pipeline' });
    let pipelineId: string;
    if (!pipeline) {
      const result = await pipelineCollection.insertOne({
        organizationId: new ObjectId(orgId),
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      } as any);
      pipelineId = result.insertedId.toHexString();
    } else {
      pipelineId = pipeline._id.toHexString();
    }

    const pipelineStageCollection = collections.pipelineStages();
    const stageIds: { order: number; id: string }[] = [];
    for (const stage of PIPELINE_STAGES) {
      const existing = await pipelineStageCollection.findOne({ organizationId: new ObjectId(orgId), pipelineId: new ObjectId(pipelineId), name: stage.name });
      if (existing) {
        stageIds.push({ order: stage.order, id: existing._id.toHexString() });
      } else {
        const result = await pipelineStageCollection.insertOne({
          organizationId: new ObjectId(orgId),
          pipelineId: new ObjectId(pipelineId),
          name: stage.name,
          order: stage.order,
          probability: stage.probability,
          isWon: stage.isWon,
          isLost: stage.isLost,
          createdAt: now,
          updatedAt: now,
        } as any);
        stageIds.push({ order: stage.order, id: result.insertedId.toHexString() });
      }
    }
    stageIds.sort((a, b) => a.order - b.order);

    const companyCollection = collections.companies();
    const companyIds: string[] = [];
    for (const company of COMPANIES) {
      const existing = await companyCollection.findOne({ organizationId: new ObjectId(orgId), normalizedName: company.normalizedName });
      if (existing) {
        companyIds.push(existing._id.toHexString());
      } else {
        const ownerKey = company.employeeCount && company.employeeCount > 1000 ? 'sales_manager' : 'sales_representative';
        const result = await companyCollection.insertOne({
          organizationId: new ObjectId(orgId),
          name: company.name,
          normalizedName: company.normalizedName,
          website: company.website,
          email: company.email,
          phone: company.phone,
          industry: company.industry,
          employeeCount: company.employeeCount,
          annualRevenue: company.annualRevenue,
          ownerId: new ObjectId(userRoleMap.get(ownerKey)!.id),
          status: company.status as 'active' | 'inactive',
          tags: [],
          customFields: {},
          description: `${company.name} is a leading company in the ${company.industry} sector.`,
          createdBy: new ObjectId(userRoleMap.get('owner')!.id),
          updatedBy: new ObjectId(userRoleMap.get('owner')!.id),
          createdAt: now,
          updatedAt: now,
        } as any);
        companyIds.push(result.insertedId.toHexString());
      }
    }

    const contactCollection = collections.contacts();
    const contactIds: string[] = [];
    for (const contact of CONTACTS) {
      const existing = await contactCollection.findOne({ organizationId: new ObjectId(orgId), emailNormalized: contact.email.toLowerCase().trim() });
      if (existing) {
        contactIds.push(existing._id.toHexString());
      } else {
        const owner = userRoleMap.get(contact.ownerKey)!;
        const result = await contactCollection.insertOne({
          organizationId: new ObjectId(orgId),
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          emailNormalized: contact.email.toLowerCase().trim(),
          phone: contact.phone,
          companyId: new ObjectId(companyIds[contact.companyIndex]),
          jobTitle: contact.jobTitle,
          ownerId: new ObjectId(owner.id),
          status: contact.status as 'active' | 'inactive',
          source: contact.source,
          tags: [tagIds[contact.companyIndex % tagIds.length]],
          customFields: {},
          createdBy: new ObjectId(owner.id),
          updatedBy: new ObjectId(owner.id),
          createdAt: now,
          updatedAt: now,
        } as any);
        contactIds.push(result.insertedId.toHexString());
      }
    }

    const leadCollection = collections.leads();
    const leadIds: string[] = [];
    for (const lead of LEADS) {
      const existing = await leadCollection.findOne({ organizationId: new ObjectId(orgId), emailNormalized: lead.email.toLowerCase().trim() });
      if (existing) {
        leadIds.push(existing._id.toHexString());
      } else {
        const owner = userRoleMap.get(lead.ownerKey)!;
        const result = await leadCollection.insertOne({
          organizationId: new ObjectId(orgId),
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          emailNormalized: lead.email.toLowerCase().trim(),
          phone: lead.phone,
          companyName: lead.companyName,
          source: lead.source,
          status: lead.status as 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted',
          ownerId: new ObjectId(owner.id),
          score: lead.score,
          tags: [tagIds[Math.floor(Math.random() * tagIds.length)]],
          customFields: {},
          createdBy: new ObjectId(owner.id),
          updatedBy: new ObjectId(owner.id),
          createdAt: now,
          updatedAt: now,
        } as any);
        leadIds.push(result.insertedId.toHexString());
      }
    }

    const dealCollection = collections.deals();
    const dealIds: string[] = [];
    for (const deal of DEALS) {
      const existing = await dealCollection.findOne({ organizationId: new ObjectId(orgId), name: deal.name });
      if (existing) {
        dealIds.push(existing._id.toHexString());
      } else {
        const owner = userRoleMap.get(deal.ownerKey)!;
        const stage = stageIds[deal.stageOrder];
        const expectedCloseDate = new Date(now.getTime() + deal.expectedCloseDays * 24 * 60 * 60 * 1000);
        const result = await dealCollection.insertOne({
          organizationId: new ObjectId(orgId),
          name: deal.name,
          pipelineId: new ObjectId(pipelineId),
          stageId: new ObjectId(stage.id),
          companyId: new ObjectId(companyIds[deal.companyIndex]),
          contactId: new ObjectId(contactIds[deal.contactIndex]),
          ownerId: new ObjectId(owner.id),
          amount: deal.amount,
          currency: deal.currency,
          probability: deal.probability,
          expectedCloseDate,
          source: deal.source,
          status: deal.status as 'open' | 'won' | 'lost',
          lostReason: deal.status === 'lost' ? 'Budget unavailable' : undefined,
          customFields: {},
          createdBy: new ObjectId(owner.id),
          updatedBy: new ObjectId(owner.id),
          createdAt: now,
          updatedAt: now,
          wonAt: deal.status === 'won' ? expectedCloseDate : undefined,
          lostAt: deal.status === 'lost' ? expectedCloseDate : undefined,
        } as any);
        dealIds.push(result.insertedId.toHexString());
      }
    }

    const activityCollection = collections.activities();
    for (const activity of ACTIVITIES) {
      const owner = userRoleMap.get(activity.ownerKey)!;
      const occurredAt = new Date(now.getTime() - activity.occurredDays * 24 * 60 * 60 * 1000);
      const aContactId = activity.contactIndex != null ? new ObjectId(contactIds[activity.contactIndex]) : undefined;
      const aCompanyId = activity.companyIndex != null ? new ObjectId(companyIds[activity.companyIndex]) : undefined;
      const aDealId = activity.dealIndex != null ? new ObjectId(dealIds[activity.dealIndex]) : undefined;
      await activityCollection.insertOne({
        organizationId: new ObjectId(orgId),
        type: activity.type as any,
        subject: activity.subject,
        description: activity.description,
        occurredAt,
        durationMinutes: activity.durationMinutes,
        ownerId: new ObjectId(owner.id),
        contactId: aContactId,
        companyId: aCompanyId,
        dealId: aDealId,
        createdBy: new ObjectId(owner.id),
        createdAt: now,
        updatedAt: now,
      } as any);
    }

    const taskCollection = collections.tasks();
    for (const task of TASKS) {
      const assignedTo = userRoleMap.get(task.assignedToKey)!;
      const dueDate = new Date(now.getTime() + task.dueDays * 24 * 60 * 60 * 1000);
      const tContactId = task.contactIndex != null ? new ObjectId(contactIds[task.contactIndex]) : undefined;
      const tCompanyId = task.companyIndex != null ? new ObjectId(companyIds[task.companyIndex]) : undefined;
      const tDealId = task.dealIndex != null ? new ObjectId(dealIds[task.dealIndex]) : undefined;
      await taskCollection.insertOne({
        organizationId: new ObjectId(orgId),
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as any,
        dueDate,
        assignedTo: new ObjectId(assignedTo.id),
        contactId: tContactId,
        companyId: tCompanyId,
        dealId: tDealId,
        createdBy: new ObjectId(assignedTo.id),
        createdAt: now,
        updatedAt: now,
      } as any);
    }

    const noteCollection = collections.notes();
    for (const note of NOTES) {
      const author = userRoleMap.get('sales_representative')!;
      const nContactId = note.contactIndex != null ? new ObjectId(contactIds[note.contactIndex]) : undefined;
      const nCompanyId = note.companyIndex != null ? new ObjectId(companyIds[note.companyIndex]) : undefined;
      const nDealId = note.dealIndex != null ? new ObjectId(dealIds[note.dealIndex]) : undefined;
      await noteCollection.insertOne({
        organizationId: new ObjectId(orgId),
        title: note.title,
        body: note.body,
        authorId: new ObjectId(author.id),
        contactId: nContactId,
        companyId: nCompanyId,
        dealId: nDealId,
        createdAt: now,
        updatedAt: now,
      } as any);
    }

    logger.info({ org: 'Acme Corporation', users: DEMO_USERS.length, companies: COMPANIES.length, contacts: CONTACTS.length, leads: LEADS.length, deals: DEALS.length }, 'Seed completed');
    logger.info('\n=== Demo Accounts ===');
    for (const u of DEMO_USERS) {
      logger.info(`  ${u.email} / [REDACTED] (${u.roleKey})`);
    }
    logger.info('=====================\n');
    process.exit(0);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Seed failed');
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
