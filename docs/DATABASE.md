CRM Platform
Database Design & API Specification

Document Version: 1.0
Status: Implementation Baseline
Database: MongoDB
Backend: Hono + TypeScript
API: REST / JSON
API Version: /api/v1
Validation: Zod
Authentication: HTTP-only session cookies

1. Purpose

This document defines the concrete database schema, MongoDB indexes, API routes, request contracts, response contracts, validation rules, permissions, pagination, filtering, sorting, error handling, and business-operation contracts required to implement the CRM.

The API contract in this document is authoritative.

Frontend and backend implementations must conform to it.

2. API Conventions
2.1 Base URL
/api/v1

Example:

GET /api/v1/contacts
2.2 Content Type

Requests containing bodies:

Content-Type: application/json

Responses:

Content-Type: application/json

File uploads use:

multipart/form-data
3. Authentication

Authentication uses secure session cookies.

Example:

Cookie: crm_session=<opaque-token>

The browser must not receive the underlying session database ID.

Cookie configuration:

HttpOnly: true
Secure: true in production
SameSite: Lax
Path: /
4. API Response Envelope
4.1 Single Resource
{
  "data": {
    "id": "66c001",
    "firstName": "John",
    "lastName": "Doe"
  }
}
4.2 Collection
{
  "data": [],
  "meta": {
    "limit": 50,
    "hasMore": true,
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2..."
  }
}
4.3 Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "fields": {
      "email": "Invalid email address."
    },
    "requestId": "req_01J..."
  }
}
5. Error Codes

Standard application error codes:

AUTHENTICATION_REQUIRED
INVALID_CREDENTIALS
SESSION_EXPIRED
ACCOUNT_SUSPENDED

FORBIDDEN
INSUFFICIENT_PERMISSION

RESOURCE_NOT_FOUND
DUPLICATE_RESOURCE
CONFLICT

VALIDATION_ERROR
INVALID_ID
INVALID_FILTER
INVALID_SORT

RATE_LIMITED

IMPORT_FAILED
EXPORT_FAILED

INTEGRATION_ERROR
WEBHOOK_ERROR

INTERNAL_ERROR
6. Pagination

All large collections use cursor pagination.

Parameters:

limit
cursor

Example:

GET /api/v1/contacts?limit=50&cursor=...

Allowed limits:

default: 50
minimum: 1
maximum: 100

Never allow arbitrary pagination sizes.

7. Sorting

Query:

sort=createdAt
direction=desc

Only predefined fields may be sorted.

Example contact sorting:

createdAt
updatedAt
firstName
lastName
email

Example deal sorting:

createdAt
updatedAt
amount
expectedCloseDate
name
8. Filtering

Simple filters use query parameters.

GET /api/v1/contacts?status=active&ownerId=...

Complex filters use JSON encoded filter objects or POST-based report/search endpoints.

Application-level operators:

eq
neq
contains
startsWith
endsWith
gt
gte
lt
lte
in
notIn
exists
between

MongoDB operators must never be accepted directly from clients.

9. Multi-Tenant Rule

Every tenant-owned collection must be scoped using:

organizationId

The value is derived from the authenticated session.

The client must never be trusted to select an arbitrary organization.

10. Database Collections

Core collections:

organizations
users
sessions
roles
teams

contacts
companies
leads

pipelines
pipeline_stages
deals

activities
tasks
notes

tags
custom_field_definitions

notifications
audit_logs
attachments

automations
automation_runs

outbox_events

import_jobs
export_jobs

api_keys
webhooks
webhook_deliveries
integrations
11. Organizations Collection

Collection:

organizations

Document:

interface OrganizationDocument {
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

  status: "active" | "suspended";

  createdAt: Date;
  updatedAt: Date;
}

Indexes:

slug UNIQUE
status
createdAt
12. Users Collection

Collection:

users

Document:

interface UserDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  email: string;
  emailNormalized: string;

  passwordHash: string;

  firstName: string;
  lastName: string;

  avatarUrl?: string;

  status:
    | "invited"
    | "active"
    | "suspended"
    | "deactivated";

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

Indexes:

organizationId + emailNormalized UNIQUE
organizationId + status
organizationId + roleIds
organizationId + teamIds
organizationId + createdAt
13. Sessions Collection

Collection:

sessions
interface SessionDocument {
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

Indexes:

tokenHash UNIQUE
userId
organizationId
expiresAt TTL
14. Roles Collection
interface RoleDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;
  description?: string;

  permissionIds: string[];

  isSystem: boolean;

  createdAt: Date;
  updatedAt: Date;
}

Indexes:

organizationId + name UNIQUE
organizationId + isSystem
15. Teams Collection
interface TeamDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;
  description?: string;

  memberIds: ObjectId[];

  managerIds: ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

Indexes:

organizationId + name UNIQUE
organizationId + memberIds
16. Contacts Collection
interface ContactDocument {
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

  status: "active" | "inactive";

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

Indexes:

organizationId + createdAt
organizationId + updatedAt
organizationId + ownerId
organizationId + companyId
organizationId + status
organizationId + tags
organizationId + emailNormalized
17. Companies Collection
interface CompanyDocument {
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

  status: "active" | "inactive";

  tags: ObjectId[];

  customFields: Record<string, unknown>;

  address?: Address;

  description?: string;

  createdAt: Date;
  updatedAt: Date;

  createdBy: ObjectId;
  updatedBy: ObjectId;

  deletedAt?: Date;
}

Indexes:

organizationId + normalizedName
organizationId + ownerId
organizationId + industry
organizationId + status
organizationId + createdAt
organizationId + tags
18. Leads Collection
interface LeadDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  firstName: string;
  lastName?: string;

  email?: string;
  emailNormalized?: string;

  phone?: string;

  companyName?: string;

  source?: string;

  status:
    | "new"
    | "contacted"
    | "qualified"
    | "unqualified"
    | "converted";

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

Indexes:

organizationId + status
organizationId + ownerId
organizationId + emailNormalized
organizationId + source
organizationId + createdAt
organizationId + tags
19. Pipelines Collection
interface PipelineDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;
  description?: string;

  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

Indexes:

organizationId + name UNIQUE
organizationId + isDefault

Only one default pipeline should exist per organization.

This should be enforced in application logic and protected against race conditions with a transaction.

20. Pipeline Stages Collection
interface PipelineStageDocument {
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

Indexes:

pipelineId + order
organizationId + pipelineId
organizationId + pipelineId + name
21. Deals Collection
interface DealDocument {
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

  status: "open" | "won" | "lost";

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

Indexes:

organizationId + pipelineId + stageId
organizationId + ownerId
organizationId + companyId
organizationId + contactId
organizationId + status
organizationId + expectedCloseDate
organizationId + createdAt
organizationId + amount
22. Activities Collection
interface ActivityDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  type:
    | "call"
    | "email"
    | "meeting"
    | "demo"
    | "follow_up"
    | "note"
    | "other";

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

Indexes:

organizationId + occurredAt
organizationId + ownerId + occurredAt
organizationId + contactId + occurredAt
organizationId + companyId + occurredAt
organizationId + dealId + occurredAt
23. Tasks Collection
interface TaskDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  title: string;
  description?: string;

  status:
    | "open"
    | "in_progress"
    | "completed"
    | "cancelled";

  priority:
    | "low"
    | "medium"
    | "high"
    | "urgent";

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

Indexes:

organizationId + assignedTo + status
organizationId + dueDate
organizationId + status + dueDate
organizationId + createdAt
24. Notes Collection
interface NoteDocument {
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

Indexes:

organizationId + createdAt
organizationId + contactId + createdAt
organizationId + companyId + createdAt
organizationId + dealId + createdAt
25. Tags Collection
interface TagDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;
  normalizedName: string;

  createdAt: Date;
}

Indexes:

organizationId + normalizedName UNIQUE
26. Custom Field Definitions
interface CustomFieldDefinitionDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  entity:
    | "contact"
    | "company"
    | "lead"
    | "deal";

  key: string;
  label: string;

  type:
    | "text"
    | "textarea"
    | "number"
    | "currency"
    | "date"
    | "datetime"
    | "boolean"
    | "select"
    | "multiselect"
    | "email"
    | "phone"
    | "url";

  required: boolean;

  options?: string[];

  order: number;

  createdAt: Date;
  updatedAt: Date;
}

Indexes:

organizationId + entity + key UNIQUE
organizationId + entity + order
27. Notifications
interface NotificationDocument {
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

Indexes:

organizationId + userId + createdAt
organizationId + userId + readAt
28. Audit Logs
interface AuditLogDocument {
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

Indexes:

organizationId + createdAt
organizationId + actorId + createdAt
organizationId + entityType + entityId

Audit records should normally be append-only.

29. Attachments
interface AttachmentDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  fileName: string;
  mimeType: string;
  size: number;

  storageKey: string;

  uploadedBy: ObjectId;

  entityType:
    | "contact"
    | "company"
    | "lead"
    | "deal"
    | "task";

  entityId: ObjectId;

  createdAt: Date;
}

Indexes:

organizationId + entityType + entityId
organizationId + createdAt
30. Automation
interface AutomationDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;

  entity:
    | "contact"
    | "lead"
    | "deal"
    | "task";

  trigger: {
    type: string;
  };

  conditions: Condition[];

  actions: Action[];

  enabled: boolean;

  createdAt: Date;
  updatedAt: Date;

  createdBy: ObjectId;
  updatedBy: ObjectId;
}
31. Automation Runs
interface AutomationRunDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  automationId: ObjectId;

  eventId: string;

  status:
    | "pending"
    | "running"
    | "completed"
    | "failed";

  error?: string;

  startedAt: Date;
  completedAt?: Date;
}

Indexes:

organizationId + automationId + createdAt
organizationId + eventId
status + createdAt
32. Outbox Events
interface OutboxEventDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  type: string;

  entityType?: string;
  entityId?: ObjectId;

  payload: Record<string, unknown>;

  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";

  attempts: number;

  availableAt: Date;

  lastError?: string;

  createdAt: Date;
  processedAt?: Date;
}

Indexes:

status + availableAt
organizationId + createdAt
33. Import Jobs
interface ImportJobDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  entity:
    | "contacts"
    | "companies"
    | "leads"
    | "deals";

  fileKey: string;

  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";

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
34. Export Jobs
interface ExportJobDocument {
  _id: ObjectId;

  organizationId: ObjectId;

  entity:
    | "contacts"
    | "companies"
    | "leads"
    | "deals";

  filters: Record<string, unknown>;

  fields: string[];

  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";

  fileKey?: string;

  totalRows?: number;

  createdBy: ObjectId;

  createdAt: Date;
  completedAt?: Date;
}
35. API Authentication
POST /api/v1/auth/login

Permission:

public

Request:

{
  "email": "john@example.com",
  "password": "password"
}

Response:

{
  "data": {
    "user": {
      "id": "66...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "organization": {
      "id": "66...",
      "name": "Example Organization"
    }
  }
}

Side effect:

Set-Cookie: crm_session=...
36. GET /api/v1/auth/me

Returns authenticated user.

Response:

{
  "data": {
    "user": {},
    "organization": {},
    "permissions": []
  }
}
37. POST /api/v1/auth/logout

Revokes current session.

Response:

204 No Content
38. POST /api/v1/auth/forgot-password

Request:

{
  "email": "john@example.com"
}

Always return a generic success response.

Do not reveal whether an account exists.

39. POST /api/v1/auth/reset-password

Request:

{
  "token": "...",
  "password": "new-password"
}

On success:

revoke all existing sessions
40. Contacts API
GET /api/v1/contacts

Permission:

contacts.read

Query:

limit
cursor
search
status
ownerId
companyId
source
tagId
sort
direction

Response:

{
  "data": [
    {
      "id": "66...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+91...",
      "company": {
        "id": "66...",
        "name": "Example Ltd"
      },
      "owner": {
        "id": "66...",
        "name": "Jane Smith"
      }
    }
  ],
  "meta": {
    "limit": 50,
    "hasMore": false,
    "nextCursor": null
  }
}
41. POST /api/v1/contacts

Permission:

contacts.create

Request:

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "companyId": "66...",
  "jobTitle": "Director",
  "ownerId": "66...",
  "source": "website",
  "tags": [],
  "customFields": {}
}

Response:

201 Created
42. GET /api/v1/contacts/:id

Permission:

contacts.read

Returns:

contact
company
owner
tags
customFields
43. PATCH /api/v1/contacts/:id

Permission:

contacts.update

Request:

{
  "firstName": "John",
  "jobTitle": "CEO"
}

Partial update only.

44. DELETE /api/v1/contacts/:id

Permission:

contacts.delete

Behavior:

soft delete
+
audit event

Response:

204
45. Companies API
GET /api/v1/companies

Permission:

companies.read

Query:

limit
cursor
search
industry
ownerId
status
sort
direction
POST /api/v1/companies

Permission:

companies.create

Request:

{
  "name": "Example Ltd",
  "website": "https://example.com",
  "email": "contact@example.com",
  "phone": "+91...",
  "industry": "Technology",
  "employeeCount": 100,
  "annualRevenue": 5000000,
  "ownerId": "66..."
}
GET /api/v1/companies/:id

Permission:

companies.read

Response should include summary information:

{
  "data": {
    "id": "66...",
    "name": "Example Ltd",
    "contactsCount": 12,
    "openDealsCount": 4,
    "openPipelineValue": 2500000
  }
}
PATCH /api/v1/companies/:id

Permission:

companies.update
DELETE /api/v1/companies/:id

Permission:

companies.delete

Soft delete.

46. Leads API
GET /api/v1/leads

Permission:

leads.read

Filters:

status
ownerId
source
score
createdAfter
createdBefore
POST /api/v1/leads

Permission:

leads.create

Request:

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+91...",
  "companyName": "Example Ltd",
  "source": "website",
  "ownerId": "66..."
}
PATCH /api/v1/leads/:id

Permission:

leads.update
47. Lead Conversion
POST /api/v1/leads/:id/convert

Permission:

leads.convert

Request:

{
  "createCompany": true,
  "createDeal": true,

  "company": {
    "name": "Example Ltd"
  },

  "deal": {
    "name": "Example Opportunity",
    "pipelineId": "66...",
    "stageId": "66...",
    "amount": 100000,
    "currency": "INR"
  }
}

Transaction:

BEGIN

validate lead

create/reuse company

create contact

create deal if requested

mark lead converted

create activity

create audit event

create outbox events

COMMIT

Response:

{
  "data": {
    "lead": {},
    "contact": {},
    "company": {},
    "deal": {}
  }
}
48. Pipeline API
GET /api/v1/pipelines

Permission:

pipelines.read
POST /api/v1/pipelines

Permission:

pipelines.create

Request:

{
  "name": "Sales Pipeline",
  "description": "Default sales pipeline",
  "isDefault": true
}
GET /api/v1/pipelines/:id

Returns:

{
  "data": {
    "id": "66...",
    "name": "Sales Pipeline",
    "stages": [
      {
        "id": "66...",
        "name": "New",
        "order": 0,
        "probability": 10,
        "isWon": false,
        "isLost": false
      }
    ]
  }
}
49. Pipeline Stage API
POST /api/v1/pipelines/:id/stages

Request:

{
  "name": "Qualified",
  "order": 2,
  "probability": 40
}
PATCH /api/v1/pipelines/:pipelineId/stages/:stageId

Allows:

name
order
probability
DELETE /api/v1/pipelines/:pipelineId/stages/:stageId

Before deletion:

check whether deals reference stage

If deals exist:

409 CONFLICT

unless a replacement stage is supplied.

50. Deals API
GET /api/v1/deals

Permission:

deals.read

Query:

pipelineId
stageId
ownerId
companyId
contactId
status
minAmount
maxAmount
expectedCloseAfter
expectedCloseBefore
search
sort
direction
51. POST /api/v1/deals

Permission:

deals.create

Request:

{
  "name": "Enterprise Contract",
  "pipelineId": "66...",
  "stageId": "66...",
  "companyId": "66...",
  "contactId": "66...",
  "ownerId": "66...",
  "amount": 2500000,
  "currency": "INR",
  "probability": 40,
  "expectedCloseDate": "2026-10-31"
}
52. GET /api/v1/deals/:id

Returns:

deal
pipeline
stage
company
contact
owner

and summary:

activities
tasks
notes
attachments
53. PATCH /api/v1/deals/:id

Permission:

deals.update

Allowed ordinary fields:

name
amount
probability
ownerId
contactId
companyId
expectedCloseDate
customFields

Stage changes should use the dedicated endpoint below.

54. Deal Stage Change
POST /api/v1/deals/:id/stage

Permission:

deals.update

Request:

{
  "stageId": "66..."
}

Service must:

validate pipeline
validate stage
update deal
calculate status
create activity
create audit
emit deal.stage_changed
55. Mark Deal Won
POST /api/v1/deals/:id/won

Permission:

deals.update

Request:

{
  "wonAt": "2026-08-07T10:30:00.000Z"
}

Result:

status = won
wonAt = supplied/current timestamp
56. Mark Deal Lost
POST /api/v1/deals/:id/lost

Request:

{
  "reason": "Budget unavailable"
}

Result:

status = lost
lostReason = ...
lostAt = current timestamp
57. Activities API
GET /api/v1/activities

Query:

type
ownerId
contactId
companyId
leadId
dealId
from
to
POST /api/v1/activities

Request:

{
  "type": "call",
  "subject": "Discovery call",
  "description": "Discussed requirements.",
  "occurredAt": "2026-08-07T10:00:00.000Z",
  "durationMinutes": 30,
  "contactId": "66...",
  "dealId": "66..."
}
58. Tasks API
GET /api/v1/tasks

Filters:

status
priority
assignedTo
dueBefore
dueAfter
contactId
companyId
dealId
POST /api/v1/tasks

Request:

{
  "title": "Send proposal",
  "description": "Prepare and send proposal.",
  "priority": "high",
  "dueDate": "2026-08-10T12:00:00.000Z",
  "assignedTo": "66...",
  "dealId": "66..."
}
59. Complete Task
POST /api/v1/tasks/:id/complete

Permission:

tasks.update

Result:

{
  "data": {
    "id": "66...",
    "status": "completed",
    "completedAt": "2026-08-07T10:30:00.000Z"
  }
}
60. Notes API
GET /api/v1/notes

Query:

contactId
companyId
leadId
dealId
POST /api/v1/notes

Request:

{
  "title": "Customer requirements",
  "body": "Customer requires SSO and audit logs.",
  "dealId": "66..."
}
61. Tags API
GET /api/v1/tags
POST /api/v1/tags
{
  "name": "Enterprise"
}
DELETE /api/v1/tags/:id

Before deletion, tag references can remain in records or be removed asynchronously.

Recommended behavior:

remove tag from associated records
delete tag
audit
62. Custom Fields API
GET /api/v1/custom-fields

Query:

entity=contact
POST /api/v1/custom-fields

Request:

{
  "entity": "contact",
  "key": "customerTier",
  "label": "Customer Tier",
  "type": "select",
  "required": false,
  "options": [
    "Standard",
    "Premium",
    "Enterprise"
  ],
  "order": 1
}
63. Notifications API
GET /api/v1/notifications

Query:

unread=true
limit=20
cursor=...
POST /api/v1/notifications/:id/read

Returns:

204
POST /api/v1/notifications/read-all

Returns:

204
64. Dashboard API
GET /api/v1/dashboard/summary

Permission:

dashboard.read

Response:

{
  "data": {
    "pipelineValue": 12450000,
    "openDeals": 42,
    "wonRevenue": 2430000,
    "lostRevenue": 870000,
    "winRate": 31.4,
    "newLeads": 128,
    "qualifiedLeads": 54,
    "overdueTasks": 17
  }
}
65. Dashboard Pipeline
GET /api/v1/dashboard/pipeline

Response:

{
  "data": [
    {
      "stageId": "66...",
      "stageName": "Qualified",
      "dealCount": 18,
      "totalValue": 4500000
    }
  ]
}

MongoDB aggregation should perform this calculation.

66. Reports API
GET /api/v1/reports/sales

Query:

from
to
ownerId
pipelineId

Response:

{
  "data": {
    "revenue": 5000000,
    "wonDeals": 21,
    "lostDeals": 14,
    "averageDealSize": 238095,
    "winRate": 60
  }
}
67. Audit API
GET /api/v1/audit-logs

Permission:

audit.read

Query:

actorId
entityType
entityId
action
from
to

Only authorized administrative users may access this endpoint.

68. Import API
POST /api/v1/imports

Initial request:

multipart/form-data

Fields:

entity
file

Response:

{
  "data": {
    "id": "66...",
    "status": "pending"
  }
}
69. GET /api/v1/imports/:id

Returns:

{
  "data": {
    "id": "66...",
    "status": "processing",
    "totalRows": 10000,
    "processedRows": 6300,
    "createdCount": 5900,
    "updatedCount": 350,
    "failedCount": 50
  }
}
70. Export API
POST /api/v1/exports

Request:

{
  "entity": "contacts",
  "fields": [
    "firstName",
    "lastName",
    "email",
    "company",
    "owner"
  ],
  "filters": {
    "status": "active"
  }
}

Response:

{
  "data": {
    "id": "66...",
    "status": "pending"
  }
}
71. GET /api/v1/exports/:id

When complete:

{
  "data": {
    "id": "66...",
    "status": "completed",
    "downloadUrl": "signed-url"
  }
}

The signed URL should be short-lived.

72. Attachments API
POST /api/v1/attachments

Upload:

multipart/form-data

Fields:

file
entityType
entityId
GET /api/v1/attachments/:id

Return a short-lived signed download URL.

DELETE /api/v1/attachments/:id

Permission must verify both:

attachment ownership
+
entity access
73. Automation API
GET /api/v1/automations
POST /api/v1/automations

Example:

{
  "name": "Follow up qualified leads",
  "entity": "lead",
  "trigger": {
    "type": "lead.status_changed"
  },
  "conditions": [
    {
      "field": "status",
      "operator": "equals",
      "value": "qualified"
    }
  ],
  "actions": [
    {
      "type": "create_task",
      "config": {
        "title": "Follow up with lead",
        "priority": "high",
        "dueInHours": 24
      }
    }
  ],
  "enabled": true
}
74. Automation Enable/Disable
POST /api/v1/automations/:id/enable
POST /api/v1/automations/:id/disable

Do not implement this as an unrestricted PATCH if the UI needs explicit operational actions.

75. API Keys
GET /api/v1/api-keys
POST /api/v1/api-keys

Request:

{
  "name": "Production Integration"
}

Response:

{
  "data": {
    "id": "66...",
    "name": "Production Integration",
    "key": "crm_live_..."
  }
}

The complete key is returned exactly once.

Database stores only the hash.

76. Webhooks
GET /api/v1/webhooks
POST /api/v1/webhooks

Request:

{
  "url": "https://example.com/webhook",
  "events": [
    "contact.created",
    "deal.created",
    "deal.won",
    "deal.lost"
  ]
}

The server generates a signing secret.

77. Webhook Events

Initial event catalog:

contact.created
contact.updated
contact.deleted

company.created
company.updated
company.deleted

lead.created
lead.updated
lead.converted

deal.created
deal.updated
deal.stage_changed
deal.won
deal.lost

task.created
task.completed

note.created

user.created
user.updated
user.deactivated
78. Webhook Delivery

Each delivery records:

eventId
webhookId
attempt
status
responseCode
responseBody
duration
createdAt

Retry on:

408
429
500
502
503
504
network failures

Do not retry most 4xx responses.

79. Search API
GET /api/v1/search

Query:

q
types
limit

Example:

GET /api/v1/search?q=acme&types=contacts,companies,deals

Response:

{
  "data": [
    {
      "type": "company",
      "id": "66...",
      "title": "Acme Corporation",
      "subtitle": "Technology"
    },
    {
      "type": "contact",
      "id": "66...",
      "title": "John Doe",
      "subtitle": "Acme Corporation"
    }
  ]
}
80. Bulk Operations

Bulk operations should use dedicated endpoints.

Example:

POST /api/v1/contacts/bulk/update

Request:

{
  "ids": [
    "66...",
    "66..."
  ],
  "changes": {
    "ownerId": "66..."
  }
}

Supported initially:

bulk update
bulk tag
bulk delete
bulk assign

Limit:

maximum 500 records per request

For larger operations, create a background job.

81. Bulk Delete
POST /api/v1/contacts/bulk/delete

Request:

{
  "ids": [
    "66...",
    "66..."
  ]
}

Response:

{
  "data": {
    "requested": 2,
    "deleted": 2,
    "failed": 0
  }
}

Every deleted record must generate an audit event.

82. Organization API
GET /api/v1/organization

Returns current organization.

PATCH /api/v1/organization

Permission:

organization.update

Request:

{
  "name": "Example Corporation",
  "timezone": "Asia/Kolkata",
  "currency": "INR",
  "locale": "en-IN"
}
83. User Management API
GET /api/v1/users

Permission:

users.read
POST /api/v1/users/invite

Permission:

users.create

Request:

{
  "email": "employee@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "roleIds": [
    "66..."
  ],
  "teamIds": [
    "66..."
  ]
}
84. PATCH /api/v1/users/:id

Allowed:

firstName
lastName
roleIds
teamIds
status

Password changes should use dedicated authentication endpoints.

85. User Deactivation
POST /api/v1/users/:id/deactivate

Behavior:

deactivate user
revoke all sessions
remove active assignments if policy requires
audit action

Never delete users immediately.

86. Roles API
GET /api/v1/roles
POST /api/v1/roles

Request:

{
  "name": "Sales Manager",
  "description": "Sales team manager",
  "permissionIds": [
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "deals.read",
    "deals.create",
    "deals.update",
    "reports.read"
  ]
}
87. Permission Catalog

Initial permission catalog:

dashboard.read

contacts.read
contacts.create
contacts.update
contacts.delete

companies.read
companies.create
companies.update
companies.delete

leads.read
leads.create
leads.update
leads.delete
leads.convert

pipelines.read
pipelines.create
pipelines.update
pipelines.delete

deals.read
deals.create
deals.update
deals.delete

activities.read
activities.create
activities.update
activities.delete

tasks.read
tasks.create
tasks.update
tasks.delete

notes.read
notes.create
notes.update
notes.delete

attachments.read
attachments.create
attachments.delete

reports.read

automations.read
automations.create
automations.update
automations.delete

imports.create
imports.read

exports.create
exports.read

audit.read

users.read
users.create
users.update
users.delete

roles.read
roles.create
roles.update
roles.delete

organization.read
organization.update

integrations.read
integrations.manage

api_keys.read
api_keys.create
api_keys.revoke

webhooks.read
webhooks.create
webhooks.update
webhooks.delete
88. Resource-Level Authorization

Permission checks alone are insufficient.

Example:

user has deals.update

does not automatically mean:

user can update every deal.

The service evaluates:

role permission
+
organization
+
record ownership
+
team membership
+
resource policy
89. API Request Context

Every service receives:

interface RequestContext {
  requestId: string;

  userId: ObjectId;
  organizationId: ObjectId;

  permissions: string[];

  ipAddress?: string;
  userAgent?: string;
}

This context is never supplied by the frontend.

90. Standard Validation Rules
Names
1–150 characters
Emails

Normalized to lowercase.

Phone numbers

Store normalized representation where possible, while preserving a display version if needed.

URLs

Must pass URL validation.

Money

Use:

number

with controlled precision or integer minor units.

For serious financial accounting requirements, use integer minor units:

₹25,000
→
2500000 paise

The CRM itself should not perform accounting.

91. Dates

API format:

ISO 8601

Example:

2026-08-07T10:30:00.000Z

Date-only fields:

2026-08-07

Database storage should use UTC.

Display timezone is determined by:

user preference
→ organization timezone
92. Currency

Deals store:

amount
currency

Example:

{
  "amount": 2500000,
  "currency": "INR"
}

Do not assume every organization uses USD.

93. API Rate Limits

Initial limits:

Authenticated API:
120 requests/minute/user

Login:
10 attempts/15 minutes/IP

Password reset:
5 attempts/hour/IP

Bulk operations:
10 requests/minute/user

Exports:
5 requests/hour/user

These are starting values and should be configurable.

94. Idempotency

Endpoints supporting idempotency:

POST /imports
POST /exports
POST /webhooks
POST /lead conversion

Header:

Idempotency-Key: <client-generated-key>

The server stores the result for the idempotency window.

95. API Versioning Policy

Breaking changes require a new API version.

Allowed without version increment:

new optional response field
new endpoint
new optional request field

Potentially breaking:

renaming fields
removing fields
changing types
changing semantics
removing enum values
96. Database Consistency Rules

References must always be tenant-aware.

Bad:

companies.findOne({
  _id: companyId
});

Correct:

companies.findOne({
  _id: companyId,
  organizationId
});

This rule applies to every tenant-owned lookup.

97. Referential Validation

When creating a deal:

pipelineId
stageId
companyId
contactId
ownerId

must all be verified.

For example:

stage.organizationId === deal.organizationId
pipeline.organizationId === deal.organizationId
stage.pipelineId === deal.pipelineId

Never assume a referenced ID belongs to the current tenant.

98. Soft Delete Query Rule

Default query:

{
  organizationId,
  deletedAt: { $exists: false }
}

Administrative recovery operations may explicitly query deleted records.

99. Audit Actions

Standard audit actions:

auth.login
auth.logout
auth.password_changed

user.created
user.updated
user.deactivated

role.created
role.updated
role.deleted

contact.created
contact.updated
contact.deleted

company.created
company.updated
company.deleted

lead.created
lead.updated
lead.converted
lead.deleted

deal.created
deal.updated
deal.stage_changed
deal.won
deal.lost
deal.deleted

task.created
task.updated
task.completed
task.deleted

automation.created
automation.updated
automation.enabled
automation.disabled

api_key.created
api_key.revoked

webhook.created
webhook.updated
webhook.deleted
100. MongoDB Index Initialization

The API should have an index bootstrap process:

application startup
        ↓
connect MongoDB
        ↓
verify collections
        ↓
create/verify indexes
        ↓
start API

Index creation must be safe to execute repeatedly.

101. Database Migration Strategy

MongoDB does not require traditional relational migrations for every schema change, but structural changes still need versioning.

Maintain:

database/migrations/
├── 001_initial_indexes.ts
├── 002_add_custom_fields.ts
├── 003_add_outbox.ts
└── ...

Each migration should be:

idempotent
versioned
logged
102. API Contract Testing

For every endpoint:

request schema
response schema
authentication
authorization
database behavior
error behavior

should have automated tests.

Example:

POST /contacts

✓ valid request → 201
✓ invalid email → 422
✓ missing firstName → 422
✓ unauthenticated → 401
✓ missing permission → 403
✓ duplicate → 409
✓ valid → audit generated
✓ valid → event generated
103. Critical Integration Tests

The following workflows must be tested end-to-end.

Lead Conversion
Lead
 ↓
Company
 ↓
Contact
 ↓
Deal
 ↓
Activity
 ↓
Audit
 ↓
Outbox

Everything succeeds or everything rolls back.

Deal Won
Deal
 ↓
status = won
 ↓
wonAt
 ↓
activity
 ↓
audit
 ↓
automation
 ↓
webhook
User Deactivation
User
 ↓
status = deactivated
 ↓
sessions revoked
 ↓
audit
 ↓
notifications/jobs handled
104. Required Frontend API Modules

Frontend API clients:

src/lib/api/
├── client.ts
├── auth.ts
├── organization.ts
├── users.ts
├── roles.ts
├── contacts.ts
├── companies.ts
├── leads.ts
├── pipelines.ts
├── deals.ts
├── activities.ts
├── tasks.ts
├── notes.ts
├── tags.ts
├── custom-fields.ts
├── notifications.ts
├── dashboard.ts
├── reports.ts
├── imports.ts
├── exports.ts
├── automations.ts
├── attachments.ts
├── webhooks.ts
└── api-keys.ts
105. Frontend API Client

All requests should pass through one client.

api.get("/contacts");
api.post("/contacts", body);
api.patch(`/contacts/${id}`, body);
api.delete(`/contacts/${id}`);

The client handles:

base URL
credentials
JSON parsing
error normalization
request IDs
authentication expiration

Components should not call fetch() directly.

106. React Query Key Convention

Examples:

["contacts"]
["contacts", filters]
["contacts", id]

["companies"]
["companies", filters]
["companies", id]

["deals"]
["deals", filters]
["deals", id]

["dashboard", "summary"]
["notifications"]

Mutation success should invalidate relevant keys.

107. Frontend Loading States

Every data-driven page must support:

initial loading
refetching
empty state
error state
success state

Do not use a full-screen spinner for every small mutation.

108. Empty States

Example:

No contacts found.

Create your first contact to begin building
your customer database.

[Create Contact]

Empty states should explain what the user can do next.

109. Destructive Actions

Dangerous actions require:

confirmation dialog
explicit action label

Example:

Delete contact?

This will remove the contact from normal CRM views.

[Cancel] [Delete Contact]
110. UI Density

The government-portal aesthetic should favor:

compact tables
clear borders
small typography
minimal decoration
strong information hierarchy

Avoid:

large gradients
excessive rounded corners
huge hero sections
floating glassmorphism
excessive animations

The interface should feel like a serious administrative system.

111. Primary Navigation

Recommended:

Dashboard

CRM
  Contacts
  Companies
  Leads

Sales
  Deals
  Pipeline

Work
  Tasks
  Activities
  Calendar

Insights
  Reports

Automation
  Automations
  Integrations

Administration
  Users
  Teams
  Roles
  Custom Fields
  Audit Logs
  Organization Settings

Navigation visibility is permission-aware.

112. Global Search

Keyboard shortcut:

/

or:

Ctrl/Cmd + K

Search:

contacts
companies
leads
deals

Results should be grouped by entity type.

113. URL State

List filters should be represented in the URL where practical.

Example:

/contacts?status=active&ownerId=123

Benefits:

shareable URLs
browser back/forward
refresh persistence
bookmarkable views
114. Final API Route Map
/auth
  POST   /login
  POST   /logout
  GET    /me
  POST   /forgot-password
  POST   /reset-password

/organization
  GET    /
  PATCH  /

/users
  GET    /
  POST   /invite
  PATCH  /:id
  POST   /:id/deactivate

/roles
  GET    /
  POST   /
  PATCH  /:id
  DELETE /:id

/teams
  GET    /
  POST   /
  PATCH  /:id
  DELETE /:id

/contacts
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id
  POST   /bulk/update
  POST   /bulk/delete

/companies
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id

/leads
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id
  POST   /:id/convert

/pipelines
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id
  POST   /:id/stages
  PATCH  /:pipelineId/stages/:stageId
  DELETE /:pipelineId/stages/:stageId

/deals
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id
  POST   /:id/stage
  POST   /:id/won
  POST   /:id/lost

/activities
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id

/tasks
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id
  POST   /:id/complete

/notes
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id

/tags
  GET    /
  POST   /
  DELETE /:id

/custom-fields
  GET    /
  POST   /
  PATCH  /:id
  DELETE /:id

/notifications
  GET    /
  POST   /:id/read
  POST   /read-all

/dashboard
  GET    /summary
  GET    /pipeline

/reports
  GET    /sales

/audit-logs
  GET    /

/attachments
  POST   /
  GET    /:id
  DELETE /:id

/imports
  POST   /
  GET    /
  GET    /:id

/exports
  POST   /
  GET    /
  GET    /:id

/automations
  GET    /
  POST   /
  GET    /:id
  PATCH  /:id
  DELETE /:id
  POST   /:id/enable
  POST   /:id/disable

/api-keys
  GET    /
  POST   /
  POST   /:id/revoke

/webhooks
  GET    /
  POST   /
  PATCH  /:id
  DELETE /:id

/search
  GET    /

/health
  GET    /

/ready
  GET    /
115. Implementation Contract

The implementation should follow this dependency direction:

                    ┌─────────────────┐
                    │     React       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   API Client    │
                    └────────┬────────┘
                             │
                          HTTPS
                             │
                             ▼
                    ┌─────────────────┐
                    │      Hono       │
                    │     Routes      │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │   Controllers   │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │    Services     │
                    │ Business Rules  │
                    └─────┬─────┬─────┘
                          │     │
                 ┌────────┘     └────────┐
                 ▼                       ▼
        ┌─────────────────┐     ┌─────────────────┐
        │  Repositories   │     │ Domain Events   │
        └────────┬────────┘     └────────┬────────┘
                 │                       │
                 ▼                       ▼
        ┌─────────────────┐     ┌─────────────────┐
        │    MongoDB      │     │     Worker      │
        └─────────────────┘     └────────┬────────┘
                                         │
                            ┌────────────┼────────────┐
                            ▼            ▼            ▼
                        Automation    Webhooks     Notifications

No frontend component may access MongoDB.

No route handler may contain significant business logic.

No repository may perform authorization.

No client-provided organizationId may determine tenant scope.

No API endpoint may bypass Zod validation.

No sensitive operation may bypass audit logging.

116. Definition of Done

A module is considered complete only when all of the following exist:

[ ] MongoDB document type
[ ] MongoDB indexes
[ ] Zod request schemas
[ ] API DTOs
[ ] Repository
[ ] Service
[ ] Controller
[ ] Routes
[ ] Permission definitions
[ ] Audit events
[ ] Domain events where required
[ ] React API client
[ ] React Query hooks
[ ] List page
[ ] Detail page
[ ] Create form
[ ] Edit form
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Unit tests
[ ] Integration tests
[ ] Authorization tests
[ ] Multi-tenant isolation tests
[ ] E2E test for critical flows
117. Release Gates

Before production deployment:

TypeScript compilation        PASS
ESLint                        PASS
Unit tests                    PASS
Integration tests             PASS
E2E tests                     PASS
Multi-tenant tests            PASS
Authorization tests           PASS
Security scan                 PASS
MongoDB indexes               VERIFIED
Database backups              VERIFIED
Restore test                  VERIFIED
Environment validation        PASS
Docker build                  PASS
Health check                  PASS
Production smoke test         PASS
118. Recommended Build Sequence

The actual implementation should now proceed in this order:

Phase 1
Monorepo
↓
Shared contracts
↓
Environment configuration
↓
MongoDB connection
↓
Hono application
↓
React shell
↓
Tailwind design system
Phase 2
Organizations
↓
Users
↓
Sessions
↓
Authentication
↓
RBAC
Phase 3
Companies
↓
Contacts
↓
Leads
↓
Lead conversion
Phase 4
Pipelines
↓
Stages
↓
Deals
↓
Activities
↓
Tasks
↓
Notes
Phase 5
Dashboard
↓
Search
↓
Filters
↓
Bulk operations
↓
Notifications
Phase 6
Audit
↓
Import
↓
Export
↓
Attachments
Phase 7
Outbox
↓
Worker
↓
Automation
↓
Webhooks
Phase 8
Reports
↓
API keys
↓
Integrations
↓
Advanced analytics
119. Important Product Boundary

The CRM should not become an ERP/accounting system accidentally.

The initial Deal.amount is a sales value, not an accounting ledger.

Do not add:

general ledger
accounts payable
accounts receivable
tax accounting
inventory
payroll

to the CRM core unless the product requirements explicitly expand into those areas.

Likewise, calendar/email integrations should be abstractions around CRM activities rather than turning the CRM into a complete email client.

This keeps the core product focused:

Customer data
+
Sales pipeline
+
Relationship history
+
Tasks
+
Automation
+
Reporting
+
Governance
120. Final Technical Contract

The implementation should be considered based on this model:

MongoDB
    ↓
Repository
    ↓
Domain Service
    ↓
Hono Controller
    ↓
REST API
    ↓
React Query
    ↓
React Feature
    ↓
Government-style UI

with:

Authentication
       +
RBAC
       +
Tenant Isolation
       +
Validation
       +
Audit
       +
Domain Events
       +
Background Jobs

as cross-cutting infrastructure.

This document, together with the SRS and TDS, is sufficient to start implementation without making major architectural decisions during ordinary CRUD development.
