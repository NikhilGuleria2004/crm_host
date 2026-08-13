import { connectDatabase } from '../db/client';
import { createQueue } from './factory';
import { exportConsumer, importConsumer, createWebhookConsumer, outboxConsumer, reportConsumer } from './consumers';
import { collections } from '../db/collections';
import { logger } from '../utils/logger';

const queue = createQueue();
queue.registerConsumer(exportConsumer);
queue.registerConsumer(importConsumer);
queue.registerConsumer(createWebhookConsumer());
queue.registerConsumer(outboxConsumer);
queue.registerConsumer(reportConsumer);

const CLEANUP_FAILED_JOB_RETENTION_DAYS = 7;
const CLEANUP_INVITATION_RETENTION_DAYS = 7;
const CLEANUP_SOFT_DELETE_RETENTION_DAYS = 90;
const CLEANUP_BATCH_SIZE = 10;

async function runCleanup(): Promise<{ failedJobs: number; expiredInvitations: number; purgedOrgs: number }> {
  const failedCutoff = new Date(Date.now() - CLEANUP_FAILED_JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const invitationCutoff = new Date(Date.now() - CLEANUP_INVITATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const softDeleteCutoff = new Date(Date.now() - CLEANUP_SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [failedResult, invitationResult] = await Promise.all([
    collections.queueJobs().deleteMany({
      status: 'failed',
      updatedAt: { $lt: failedCutoff },
    }),
    collections.organizationMemberships().updateMany(
      { status: 'invited', createdAt: { $lt: invitationCutoff } },
      { $set: { status: 'expired', updatedAt: new Date() } }
    ),
  ]);

  let purgedOrgs = 0;
  const orgs = await collections.organizations().find({}).limit(CLEANUP_BATCH_SIZE).toArray();
  for (const org of orgs) {
    const orgId = org._id;
    const deleteFilter = { organizationId: orgId, deletedAt: { $lt: softDeleteCutoff } };
    const [contacts, companies, leads, deals, notes] = await Promise.all([
      collections.contacts().countDocuments(deleteFilter),
      collections.companies().countDocuments(deleteFilter),
      collections.leads().countDocuments(deleteFilter),
      collections.deals().countDocuments(deleteFilter),
      collections.notes().countDocuments(deleteFilter),
    ]);
    if (contacts + companies + leads + deals + notes === 0) continue;
    await Promise.all([
      collections.contacts().deleteMany(deleteFilter),
      collections.companies().deleteMany(deleteFilter),
      collections.leads().deleteMany(deleteFilter),
      collections.deals().deleteMany(deleteFilter),
      collections.notes().deleteMany(deleteFilter),
    ]);
    purgedOrgs++;
  }

  return {
    failedJobs: failedResult.deletedCount,
    expiredInvitations: invitationResult.modifiedCount,
    purgedOrgs,
  };
}

export default async function handler() {
  try {
    await connectDatabase();
    const cleanup = await runCleanup();
    const processed = await queue.processAll(10);
    logger.info({ processed, cleanup }, 'Cron processed queue jobs and cleanup');
    return new Response(JSON.stringify({ processed, cleanup }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Cron failed');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
