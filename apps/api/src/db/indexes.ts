import { connectDatabase } from './client';
import { logger } from '../utils/logger';

export async function bootstrapIndexes(): Promise<void> {
  const db = await connectDatabase();

  const organizations = db.collection('organizations');
  await organizations.createIndex({ slug: 1 }, { unique: true });
  await organizations.createIndex({ status: 1 });
  await organizations.createIndex({ createdAt: 1 });

  const users = db.collection('users');
  await users.createIndex({ organizationId: 1, emailNormalized: 1 }, { unique: true });
  await users.createIndex({ organizationId: 1, status: 1 });
  await users.createIndex({ organizationId: 1, createdAt: 1 });

  const sessions = db.collection('sessions');
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ userId: 1 });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  const roles = db.collection('roles');
  await roles.createIndex({ organizationId: 1, name: 1 }, { unique: true });
  await roles.createIndex({ organizationId: 1, isSystem: 1 });

  const teams = db.collection('teams');
  await teams.createIndex({ organizationId: 1, name: 1 }, { unique: true });
  await teams.createIndex({ organizationId: 1, memberIds: 1 });

  const contacts = db.collection('contacts');
  await contacts.createIndex({ organizationId: 1, createdAt: 1 });
  await contacts.createIndex({ organizationId: 1, ownerId: 1 });
  await contacts.createIndex({ organizationId: 1, companyId: 1 });
  await contacts.createIndex({ organizationId: 1, status: 1 });
  await contacts.createIndex({ organizationId: 1, tags: 1 });
  await contacts.createIndex({ organizationId: 1, emailNormalized: 1 });

  const companies = db.collection('companies');
  await companies.createIndex({ organizationId: 1, normalizedName: 1 });
  await companies.createIndex({ organizationId: 1, ownerId: 1 });
  await companies.createIndex({ organizationId: 1, industry: 1 });
  await companies.createIndex({ organizationId: 1, status: 1 });
  await companies.createIndex({ organizationId: 1, createdAt: 1 });
  await companies.createIndex({ organizationId: 1, tags: 1 });

  const leads = db.collection('leads');
  await leads.createIndex({ organizationId: 1, status: 1 });
  await leads.createIndex({ organizationId: 1, ownerId: 1 });
  await leads.createIndex({ organizationId: 1, emailNormalized: 1 });
  await leads.createIndex({ organizationId: 1, source: 1 });
  await leads.createIndex({ organizationId: 1, createdAt: 1 });
  await leads.createIndex({ organizationId: 1, tags: 1 });

  const pipelines = db.collection('pipelines');
  await pipelines.createIndex({ organizationId: 1, name: 1 }, { unique: true });
  await pipelines.createIndex({ organizationId: 1, isDefault: 1 });

  const pipelineStages = db.collection('pipeline_stages');
  await pipelineStages.createIndex({ pipelineId: 1, order: 1 });
  await pipelineStages.createIndex({ organizationId: 1, pipelineId: 1 });
  await pipelineStages.createIndex({ organizationId: 1, pipelineId: 1, name: 1 });

  const deals = db.collection('deals');
  await deals.createIndex({ organizationId: 1, pipelineId: 1, stageId: 1 });
  await deals.createIndex({ organizationId: 1, ownerId: 1 });
  await deals.createIndex({ organizationId: 1, companyId: 1 });
  await deals.createIndex({ organizationId: 1, contactId: 1 });
  await deals.createIndex({ organizationId: 1, status: 1 });
  await deals.createIndex({ organizationId: 1, expectedCloseDate: 1 });
  await deals.createIndex({ organizationId: 1, createdAt: 1 });
  await deals.createIndex({ organizationId: 1, amount: 1 });

  const activities = db.collection('activities');
  await activities.createIndex({ organizationId: 1, occurredAt: 1 });
  await activities.createIndex({ organizationId: 1, ownerId: 1, occurredAt: 1 });
  await activities.createIndex({ organizationId: 1, contactId: 1, occurredAt: 1 });
  await activities.createIndex({ organizationId: 1, companyId: 1, occurredAt: 1 });
  await activities.createIndex({ organizationId: 1, dealId: 1, occurredAt: 1 });

  const tasks = db.collection('tasks');
  await tasks.createIndex({ organizationId: 1, assignedTo: 1, status: 1 });
  await tasks.createIndex({ organizationId: 1, dueDate: 1 });
  await tasks.createIndex({ organizationId: 1, status: 1, dueDate: 1 });
  await tasks.createIndex({ organizationId: 1, createdAt: 1 });

  const notes = db.collection('notes');
  await notes.createIndex({ organizationId: 1, createdAt: 1 });
  await notes.createIndex({ organizationId: 1, contactId: 1, createdAt: 1 });
  await notes.createIndex({ organizationId: 1, companyId: 1, createdAt: 1 });
  await notes.createIndex({ organizationId: 1, dealId: 1, createdAt: 1 });

  const tags = db.collection('tags');
  await tags.createIndex({ organizationId: 1, normalizedName: 1 }, { unique: true });

  const customFieldDefinitions = db.collection('custom_field_definitions');
  await customFieldDefinitions.createIndex({ organizationId: 1, entity: 1, key: 1 }, { unique: true });
  await customFieldDefinitions.createIndex({ organizationId: 1, entity: 1, order: 1 });

  const notifications = db.collection('notifications');
  await notifications.createIndex({ organizationId: 1, userId: 1, createdAt: 1 });
  await notifications.createIndex({ organizationId: 1, userId: 1, readAt: 1 });

  const auditLogs = db.collection('audit_logs');
  await auditLogs.createIndex({ organizationId: 1, createdAt: 1 });
  await auditLogs.createIndex({ organizationId: 1, actorId: 1, createdAt: 1 });
  await auditLogs.createIndex({ organizationId: 1, entityType: 1, entityId: 1 });

  const attachments = db.collection('attachments');
  await attachments.createIndex({ organizationId: 1, entityType: 1, entityId: 1 });
  await attachments.createIndex({ organizationId: 1, createdAt: 1 });

  const automations = db.collection('automations');
  await automations.createIndex({ organizationId: 1, createdAt: 1 });

  const automationRuns = db.collection('automation_runs');
  await automationRuns.createIndex({ organizationId: 1, automationId: 1, createdAt: 1 });
  await automationRuns.createIndex({ organizationId: 1, eventId: 1 });
  await automationRuns.createIndex({ status: 1, createdAt: 1 });

  const outboxEvents = db.collection('outbox_events');
  await outboxEvents.createIndex({ status: 1, availableAt: 1 });
  await outboxEvents.createIndex({ organizationId: 1, createdAt: 1 });

  const importJobs = db.collection('import_jobs');
  await importJobs.createIndex({ organizationId: 1, createdAt: 1 });
  await importJobs.createIndex({ organizationId: 1, status: 1 });

  const exportJobs = db.collection('export_jobs');
  await exportJobs.createIndex({ organizationId: 1, createdAt: 1 });
  await exportJobs.createIndex({ organizationId: 1, status: 1 });

  const apiKeys = db.collection('api_keys');
  await apiKeys.createIndex({ organizationId: 1, keyHash: 1 }, { unique: true });
  await apiKeys.createIndex({ organizationId: 1, createdAt: 1 });
  await apiKeys.createIndex({ organizationId: 1, createdAt: 1, _id: 1 });

  const webhooks = db.collection('webhooks');
  await webhooks.createIndex({ organizationId: 1, createdAt: 1 });
  await webhooks.createIndex({ organizationId: 1, createdAt: 1, _id: 1 });

  const webhookDeliveries = db.collection('webhook_deliveries');
  await webhookDeliveries.createIndex({ webhookId: 1, createdAt: -1 });
  await webhookDeliveries.createIndex({ organizationId: 1, createdAt: -1 });
  await webhookDeliveries.createIndex({ status: 1, nextRetryAt: 1 });

  const integrations = db.collection('integrations');
  await integrations.createIndex({ organizationId: 1, provider: 1 }, { unique: true });
  await integrations.createIndex({ organizationId: 1, createdAt: 1 });
  await integrations.createIndex({ organizationId: 1, createdAt: 1, _id: 1 });

  const passwordResetTokens = db.collection('password_reset_tokens');
  await passwordResetTokens.createIndex({ tokenHash: 1 }, { unique: true });
  await passwordResetTokens.createIndex({ userId: 1 });
  await passwordResetTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  const organizationMemberships = db.collection('organization_memberships');
  await organizationMemberships.createIndex({ organizationId: 1, userId: 1 }, { unique: true });
  await organizationMemberships.createIndex({ organizationId: 1, status: 1 });
  await organizationMemberships.createIndex({ userId: 1 });

  const rolePermissions = db.collection('role_permissions');
  await rolePermissions.createIndex({ roleId: 1, permission: 1 }, { unique: true });
  await rolePermissions.createIndex({ organizationId: 1, permission: 1 });
  await rolePermissions.createIndex({ organizationId: 1, roleId: 1 });

  const rateLimits = db.collection('rate_limits');
  await rateLimits.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });

  const files = db.collection('files');
  await files.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 0 });

  const queueJobs = db.collection('queue_jobs');
  await queueJobs.createIndex({ status: 1, availableAt: 1 });
  await queueJobs.createIndex({ type: 1, 'payload.jobId': 1 });

  logger.info('Indexes bootstrapped successfully');
}
