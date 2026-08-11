export type {
  OrganizationDocument,
  UserDocument,
  SessionDocument,
  RoleDocument,
  TeamDocument,
  ContactDocument,
  CompanyDocument,
  LeadDocument,
  PipelineDocument,
  PipelineStageDocument,
  DealDocument,
  ActivityDocument,
  TaskDocument,
  NoteDocument,
  TagDocument,
  CustomFieldDefinitionDocument,
  NotificationDocument,
  AuditLogDocument,
  AttachmentDocument,
  AutomationDocument,
  AutomationRunDocument,
  OutboxEventDocument,
  ImportJobDocument,
  ExportJobDocument,
  ApiKeyDocument,
  WebhookDocument,
  WebhookDeliveryDocument,
  IntegrationDocument,
  PasswordResetTokenDocument,
  OrganizationMembershipDocument,
  RolePermissionDocument,
} from './documents';

export {
  ORGANIZATION_STATUSES,
  USER_STATUSES,
  LEAD_STATUSES,
  DEAL_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  ACTIVITY_TYPES,
} from '@crm/shared';

export {
  PERMISSIONS,
  DEFAULT_ROLES,
  type PermissionDefinition,
  type RoleDefinition,
  type PermissionScope,
} from '@crm/shared';

export { DEFAULT_PIPELINE_STAGES } from '@crm/shared';
