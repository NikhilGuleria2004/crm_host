import { Hono } from 'hono';
import { requestId, securityHeaders, requestLogger, cors, errorHandler, requestSizeLimit } from './middleware';
import { authenticate } from './middleware';
import { organizationContext } from './middleware';
import { rateLimiter } from './middleware';
import { checkDatabaseHealth } from './db';
import { createOrganizationsRoutes } from './modules/organizations';
import { createUsersRoutes } from './modules/users';
import { createSessionsRoutes } from './modules/sessions';
import { createAuthRoutes } from './modules/auth';
import { createMembershipsRoutes } from './modules/memberships';
import { createTeamsRoutes } from './modules/teams';
import { createRolesRoutes } from './modules/roles';
import { createAuditRoutes } from './modules/audit';
import { createContactsRoutes } from './modules/contacts';
import { createCompaniesRoutes } from './modules/companies';
import { createActivitiesRoutes } from './modules/activities';
import { createNotesRoutes } from './modules/notes';
import { createLeadsRoutes } from './modules/leads';
import { createPipelinesRoutes } from './modules/pipelines';
import { createDealsRoutes } from './modules/deals';
import { createTasksRoutes } from './modules/tasks';
import { createNotificationsRoutes } from './modules/notifications';
import { createSearchRoutes } from './modules/search';
import { createImportsRoutes } from './modules/imports';
import { createExportsRoutes } from './modules/exports';
import { createCustomFieldsRoutes } from './modules/custom-fields';
import { createTagsRoutes } from './modules/tags';
import { createDashboardRoutes } from './modules/dashboard';
import { createReportsRoutes } from './modules/reports';
import { createApiKeysRoutes } from './modules/api-keys';
import { createWebhooksRoutes } from './modules/webhooks';
import { createIntegrationsRoutes } from './modules/integrations';

const app = new Hono();

app.use('*', errorHandler());
app.use('*', requestId());
app.use('*', requestLogger());
app.use('*', securityHeaders());
app.use('*', cors());
app.use('*', requestSizeLimit());

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/ready', async (c) => {
  const dbHealth = await checkDatabaseHealth();
  const configHealth = checkConfigHealth();
  const isHealthy = dbHealth.status === 'healthy' && configHealth.status === 'healthy';
  return c.json(
    { status: isHealthy ? 'ready' : 'not ready', database: dbHealth, config: configHealth },
    isHealthy ? 200 : 503
  );
});

function checkConfigHealth() {
  const required = ['MONGODB_URI', 'MONGODB_DATABASE', 'SESSION_SECRET', 'CORS_ORIGIN'];
  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    return { status: 'unhealthy' as const, missing };
  }
  return { status: 'healthy' as const };
}

app.get('/', (c) => c.text('CRM API'));

app.use('/api/v1/auth/login', rateLimiter({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: 'login' }));
app.use('/api/v1/auth/forgot-password', rateLimiter({ windowMs: 60 * 60 * 1000, max: 3, keyPrefix: 'forgot' }));
app.use('/api/v1/auth/reset-password', rateLimiter({ windowMs: 60 * 60 * 1000, max: 3, keyPrefix: 'reset' }));

app.use('/api/v1/*', authenticate);
app.use('/api/v1/*', organizationContext);

app.route('/api/v1/auth', createAuthRoutes());
app.route('/api/v1/organizations', createOrganizationsRoutes());
app.route('/api/v1/users', createUsersRoutes());
app.route('/api/v1/sessions', createSessionsRoutes());
app.route('/api/v1/memberships', createMembershipsRoutes());
app.route('/api/v1/teams', createTeamsRoutes());
app.route('/api/v1/roles', createRolesRoutes());
app.route('/api/v1/audit-logs', createAuditRoutes());
app.route('/api/v1/contacts', createContactsRoutes());
app.route('/api/v1/companies', createCompaniesRoutes());
app.route('/api/v1/activities', createActivitiesRoutes());
app.route('/api/v1/notes', createNotesRoutes());
app.route('/api/v1/leads', createLeadsRoutes());
app.route('/api/v1/pipelines', createPipelinesRoutes());
app.route('/api/v1/deals', createDealsRoutes());
app.route('/api/v1/tasks', createTasksRoutes());
app.route('/api/v1/notifications', createNotificationsRoutes());
app.route('/api/v1/search', createSearchRoutes());
app.route('/api/v1/imports', createImportsRoutes());
app.route('/api/v1/exports', createExportsRoutes());
app.route('/api/v1/custom-fields', createCustomFieldsRoutes());
app.route('/api/v1/tags', createTagsRoutes());
app.route('/api/v1/dashboard', createDashboardRoutes());
app.route('/api/v1/reports', createReportsRoutes());
app.route('/api/v1/api-keys', createApiKeysRoutes());
app.route('/api/v1/webhooks', createWebhooksRoutes());
app.route('/api/v1/integrations', createIntegrationsRoutes());

export default app;
