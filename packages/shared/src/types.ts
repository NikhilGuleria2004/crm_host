export type ObjectId = string;

export interface OrganizationDocument {
  _id: ObjectId;
  name: string;
  slug: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  locale: string;
  settings: {
    dateFormat: string;
    fiscalYearStartMonth: number;
    defaultPipelineId?: ObjectId;
    features?: {
      automation?: boolean;
      integrations?: boolean;
      apiAccess?: boolean;
    };
  };
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status: 'invited' | 'active' | 'suspended' | 'deactivated';
  roleIds: ObjectId[];
  teamIds: ObjectId[];
  lastLoginAt?: Date;
  preferences: {
    timezone?: string;
    locale?: string;
    dateFormat?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument {
  _id: ObjectId;
  userId: ObjectId;
  organizationId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date;
}

export interface RoleDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  description?: string;
  permissionIds: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  description?: string;
  memberIds: ObjectId[];
  managerIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  firstName: string;
  lastName?: string;
  email?: string;
  emailNormalized?: string;
  phone?: string;
  companyId?: ObjectId;
  jobTitle?: string;
  ownerId?: ObjectId;
  status: 'active' | 'inactive';
  source?: string;
  tags: ObjectId[];
  customFields: Record<string, unknown>;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  deletedAt?: Date;
}

export interface CompanyDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  normalizedName: string;
  website?: string;
  email?: string;
  phone?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  ownerId?: ObjectId;
  status: 'active' | 'inactive';
  tags: ObjectId[];
  customFields: Record<string, unknown>;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  deletedAt?: Date;
}

export interface LeadDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  firstName: string;
  lastName?: string;
  email?: string;
  emailNormalized?: string;
  phone?: string;
  companyName?: string;
  source?: string;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  ownerId?: ObjectId;
  score?: number;
  tags: ObjectId[];
  customFields: Record<string, unknown>;
  convertedAt?: Date;
  convertedContactId?: ObjectId;
  convertedCompanyId?: ObjectId;
  convertedDealId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  deletedAt?: Date;
}

export interface PipelineDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStageDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  pipelineId: ObjectId;
  name: string;
  order: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  pipelineId: ObjectId;
  stageId: ObjectId;
  companyId?: ObjectId;
  contactId?: ObjectId;
  ownerId: ObjectId;
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate?: Date;
  source?: string;
  status: 'open' | 'won' | 'lost';
  lostReason?: string;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  wonAt?: Date;
  lostAt?: Date;
  deletedAt?: Date;
}

export interface ActivityDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'follow_up' | 'note' | 'other';
  subject: string;
  description?: string;
  occurredAt: Date;
  durationMinutes?: number;
  ownerId: ObjectId;
  contactId?: ObjectId;
  companyId?: ObjectId;
  leadId?: ObjectId;
  dealId?: ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
}

export interface TaskDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignedTo: ObjectId;
  contactId?: ObjectId;
  companyId?: ObjectId;
  dealId?: ObjectId;
  leadId?: ObjectId;
  reminderAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
}

export interface NoteDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  title?: string;
  body: string;
  authorId: ObjectId;
  contactId?: ObjectId;
  companyId?: ObjectId;
  leadId?: ObjectId;
  dealId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface TagDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  normalizedName: string;
  createdAt: Date;
}

export interface CustomFieldDefinitionDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  entity: 'contact' | 'company' | 'lead' | 'deal';
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect' | 'email' | 'phone' | 'url';
  required: boolean;
  options?: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  userId: ObjectId;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: ObjectId;
  readAt?: Date;
  createdAt: Date;
}

export interface AuditLogDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  actorId?: ObjectId;
  action: string;
  entityType?: string;
  entityId?: ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AttachmentDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedBy: ObjectId;
  entityType: 'contact' | 'company' | 'lead' | 'deal' | 'task';
  entityId: ObjectId;
  createdAt: Date;
}

export interface AutomationDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  entity: 'contact' | 'lead' | 'deal' | 'task';
  trigger: { type: string };
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  actions: Array<{ type: string; config: Record<string, unknown> }>;
  enabled: boolean;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationRunDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  automationId: ObjectId;
  eventId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface OutboxEventDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  type: string;
  entityType?: string;
  entityId?: ObjectId;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  availableAt: Date;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface ImportJobDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  entity: 'contacts' | 'companies' | 'leads' | 'deals';
  fileKey: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errorFileKey?: string;
  createdBy: ObjectId;
  createdAt: Date;
  completedAt?: Date;
}

export interface ExportJobDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  entity: 'contacts' | 'companies' | 'leads' | 'deals';
  filters: Record<string, unknown>;
  fields: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileKey?: string;
  totalRows?: number;
  createdBy: ObjectId;
  createdAt: Date;
  completedAt?: Date;
}

export interface ApiKeyDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt?: Date;
  createdBy: ObjectId;
  createdAt: Date;
  revokedAt?: Date;
}

export interface WebhookDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
}

export interface IntegrationDocument {
  _id: ObjectId;
  organizationId: ObjectId;
  provider: string;
  status: 'connected' | 'disconnected';
  credentials: Record<string, unknown>;
  settings: Record<string, unknown>;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

