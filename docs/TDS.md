Technical Design Specification — CRM Platform

Document Version: 1.0
Status: Implementation Baseline
Architecture: Modular Monolith
Language: TypeScript
Frontend: React + Vite + Tailwind CSS
Backend: Hono + TypeScript
Database: MongoDB
API: REST/JSON
Authentication: Secure HTTP-only cookie sessions
UI: Government/public-sector administrative portal
Primary Font: JetBrains Mono

1. Architecture Decision
1.1 Architecture Style

The initial system shall be implemented as a modular monolith.

Do not start with microservices.

                    ┌─────────────────────┐
                    │      Browser        │
                    │ React + TypeScript  │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │     Hono API        │
                    │                     │
                    │ Authentication      │
                    │ Authorization       │
                    │ CRM Modules         │
                    │ Reporting           │
                    │ Automation          │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             ▼                 ▼                  ▼
       ┌──────────┐      ┌────────────┐    ┌──────────────┐
       │ MongoDB  │      │ File/Object│    │ External APIs│
       │          │      │ Storage    │    │              │
       └──────────┘      └────────────┘    └──────────────┘

This provides:

simple deployment
shared types
straightforward transactions
low operational complexity
clear module boundaries
ability to extract services later
2. Repository Structure

Use a monorepo.

crm/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── contracts/
│   ├── validation/
│   ├── config/
│   ├── ui/
│   └── utils/
│
├── infrastructure/
│   ├── nginx/
│   └── scripts/
│
├── docs/
│   ├── srs/
│   ├── tds/
│   ├── api/
│   └── architecture/
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md

Use pnpm workspaces.

3. Frontend Structure
apps/web/
└── src/
    ├── app/
    │   ├── App.tsx
    │   ├── router.tsx
    │   ├── providers.tsx
    │   └── layouts/
    │
    ├── components/
    │   ├── ui/
    │   ├── data-table/
    │   ├── forms/
    │   ├── navigation/
    │   └── feedback/
    │
    ├── features/
    │   ├── auth/
    │   ├── dashboard/
    │   ├── contacts/
    │   ├── companies/
    │   ├── leads/
    │   ├── deals/
    │   ├── pipelines/
    │   ├── activities/
    │   ├── tasks/
    │   ├── calendar/
    │   ├── reports/
    │   ├── automation/
    │   ├── integrations/
    │   └── administration/
    │
    ├── lib/
    │   ├── api/
    │   ├── auth/
    │   ├── permissions/
    │   ├── formatting/
    │   └── errors/
    │
    ├── hooks/
    ├── types/
    ├── config/
    └── main.tsx
4. Backend Structure
apps/api/
└── src/
    ├── app.ts
    ├── server.ts
    │
    ├── config/
    │   ├── env.ts
    │   └── constants.ts
    │
    ├── db/
    │   ├── client.ts
    │   ├── indexes.ts
    │   └── collections.ts
    │
    ├── middleware/
    │   ├── auth.ts
    │   ├── organization.ts
    │   ├── authorization.ts
    │   ├── rate-limit.ts
    │   ├── request-id.ts
    │   ├── error-handler.ts
    │   └── logging.ts
    │
    ├── modules/
    │
    │   ├── auth/
    │   ├── organizations/
    │   ├── users/
    │   ├── teams/
    │   ├── roles/
    │   ├── contacts/
    │   ├── companies/
    │   ├── leads/
    │   ├── pipelines/
    │   ├── deals/
    │   ├── activities/
    │   ├── tasks/
    │   ├── notes/
    │   ├── attachments/
    │   ├── tags/
    │   ├── custom-fields/
    │   ├── notifications/
    │   ├── reports/
    │   ├── automation/
    │   ├── integrations/
    │   ├── imports/
    │   ├── exports/
    │   ├── webhooks/
    │   └── audit/
    │
    ├── services/
    │   ├── email/
    │   ├── storage/
    │   ├── jobs/
    │   └── search/
    │
    ├── utils/
    └── types/
5. Backend Module Pattern

Every business module follows:

contacts/
├── contacts.routes.ts
├── contacts.controller.ts
├── contacts.service.ts
├── contacts.repository.ts
├── contacts.schema.ts
├── contacts.types.ts
├── contacts.permissions.ts
└── index.ts
Responsibility

Routes

HTTP route registration.

Controller

Converts HTTP request → service call → HTTP response.

Service

Business logic.

Repository

MongoDB queries.

Schema

Zod validation.

Types

Domain types.

Permissions

Permission definitions/checks.

6. Request Lifecycle

Every authenticated request follows:

HTTP
 ↓
Request ID
 ↓
Logging
 ↓
Rate Limit
 ↓
Authentication
 ↓
Organization Resolution
 ↓
Permission Check
 ↓
Request Validation
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
MongoDB
 ↓
Audit/Event
 ↓
Response
7. Hono Application

Conceptually:

const app = new Hono();

app.use("*", requestId());
app.use("*", logger());
app.use("*", securityHeaders());
app.use("/api/*", rateLimiter());

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/contacts", contactsRoutes);
app.route("/api/v1/companies", companiesRoutes);
app.route("/api/v1/leads", leadsRoutes);
app.route("/api/v1/deals", dealsRoutes);

Protected routes use:

authenticate
→ organizationContext
→ requirePermission(...)
8. MongoDB Strategy

Use MongoDB's native Node.js driver.

Avoid introducing an ORM unless there's a compelling reason.

MongoDB provides:

flexible documents
transactions
indexes
aggregation
text/search capabilities
good TypeScript support

The application should still maintain strict TypeScript domain types and Zod validation.

9. MongoDB Object IDs

Use MongoDB ObjectId internally.

API responses should expose IDs as strings.

Database:

_id: ObjectId

API:

{
  "id": "66b123..."
}

Never expose raw MongoDB implementation details unnecessarily.

10. Common Document Fields

All tenant-owned documents should generally contain:

interface BaseDocument {
  _id: ObjectId;
  organizationId: ObjectId;

  createdAt: Date;
  updatedAt: Date;

  createdBy?: ObjectId;
  updatedBy?: ObjectId;

  deletedAt?: Date;
}

Not every document requires every field, but this should be the default.

11. Organization
interface Organization {
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
  };

  status: "active" | "suspended";

  createdAt: Date;
  updatedAt: Date;
}

Indexes:

slug UNIQUE
status
12. User
interface User {
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
organizationId + teamIds
13. Sessions
interface Session {
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
expiresAt

Use a TTL index for expired sessions.

14. Roles
interface Role {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;
  description?: string;

  permissionIds: string[];

  isSystem: boolean;

  createdAt: Date;
  updatedAt: Date;
}

Permission strings:

contacts.read
contacts.create
contacts.update
contacts.delete

deals.read
deals.create
deals.update
deals.delete

reports.read

users.manage
settings.manage
audit.read
15. Contacts
interface Contact {
  _id: ObjectId;
  organizationId: ObjectId;

  firstName: string;
  lastName?: string;

  email?: string;
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
organizationId + ownerId
organizationId + email
organizationId + companyId
organizationId + status
organizationId + tags
16. Companies
interface Company {
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

  deletedAt?: Date;
}

Indexes:

organizationId + normalizedName
organizationId + ownerId
organizationId + industry
organizationId + createdAt
17. Leads
interface Lead {
  _id: ObjectId;
  organizationId: ObjectId;

  firstName: string;
  lastName?: string;

  email?: string;
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

  convertedAt?: Date;
  convertedContactId?: ObjectId;
  convertedCompanyId?: ObjectId;
  convertedDealId?: ObjectId;

  customFields: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;

  deletedAt?: Date;
}
18. Pipelines
interface Pipeline {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;
  description?: string;

  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}
19. Pipeline Stages
interface PipelineStage {
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
20. Deals
interface Deal {
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
21. Activities
interface Activity {
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
}

Indexes:

organizationId + occurredAt
organizationId + contactId + occurredAt
organizationId + companyId + occurredAt
organizationId + dealId + occurredAt
22. Tasks
interface Task {
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

  completedAt?: Date;

  reminderAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

Indexes:

organizationId + assignedTo + status
organizationId + dueDate
organizationId + status + dueDate
23. Notes
interface Note {
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
24. Custom Fields

Definitions:

interface CustomFieldDefinition {
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

Entity values can initially be embedded:

customFields: {
  customerTier: "enterprise",
  renewalDate: "2026-12-31"
}

This avoids creating a huge EAV collection for the first version.

25. Tags
interface Tag {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;

  createdAt: Date;
}

Unique index:

organizationId + normalizedName
26. Notifications
interface Notification {
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

userId + readAt + createdAt
organizationId + createdAt
27. Audit Logs
interface AuditLog {
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

Do not store sensitive credentials in before/after.

28. Attachments

MongoDB should store metadata, not large files.

interface Attachment {
  _id: ObjectId;

  organizationId: ObjectId;

  fileName: string;
  mimeType: string;
  size: number;

  storageKey: string;

  uploadedBy: ObjectId;

  entityType: string;
  entityId: ObjectId;

  createdAt: Date;
}

Storage:

S3-compatible object storage
29. Import Jobs
interface ImportJob {
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
30. API Contract

All APIs live under:

/api/v1

Example:

GET    /api/v1/contacts
POST   /api/v1/contacts
GET    /api/v1/contacts/:id
PATCH  /api/v1/contacts/:id
DELETE /api/v1/contacts/:id
31. Response Format

Single resource:

{
  "data": {
    "id": "..."
  }
}

List:

{
  "data": [],
  "meta": {
    "hasMore": true,
    "nextCursor": "..."
  }
}

Error:

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "fields": {
      "email": "Invalid email address"
    }
  }
}
32. HTTP Status Rules
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Rate Limited

500 Internal Server Error
33. Validation

All external input must be validated with Zod.

Example:

const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  companyId: z.string().optional(),
  ownerId: z.string().optional()
});

Never trust:

query parameters
route parameters
JSON body
uploaded files
webhook payloads
34. Authorization

Create a reusable authorization function:

requirePermission("contacts.create")

The permission middleware should:

Verify authentication.
Resolve organization.
Load user's roles.
Resolve permissions.
Check requested permission.
Apply resource-level restrictions.
35. Ownership Rules

For sales representatives:

own records → full permitted access
team records → configurable
other records → restricted

Managers may see their team.

Administrators may see the organization.

This should be implemented as a reusable access scope abstraction.

Example:

type AccessScope =
  | "own"
  | "team"
  | "organization";
36. Repository Pattern

Example:

class ContactRepository {
  constructor(
    private readonly collection: Collection<Contact>
  ) {}

  async findById(
    organizationId: ObjectId,
    id: ObjectId
  ) {
    return this.collection.findOne({
      _id: id,
      organizationId,
      deletedAt: { $exists: false }
    });
  }
}

Repositories must never accept an unscoped tenant query from controllers.

37. Service Layer

Example:

class ContactService {
  async create(
    context: RequestContext,
    input: CreateContactInput
  ) {
    // validate business rules
    // resolve owner
    // create document
    // emit audit event
    // return result
  }
}

The service owns business rules.

38. Request Context

Every authenticated request should produce:

interface RequestContext {
  requestId: string;

  userId: ObjectId;
  organizationId: ObjectId;

  permissions: string[];

  ipAddress?: string;
  userAgent?: string;
}

Pass this context into services.

39. Lead Conversion Transaction

Lead conversion must use a MongoDB transaction.

START TRANSACTION

1. Verify lead belongs to organization
2. Verify lead isn't already converted
3. Create/reuse company
4. Create contact
5. Optionally create deal
6. Mark lead converted
7. Create activity
8. Create audit event

COMMIT

If any operation fails:

ROLLBACK
40. Deal Stage Changes

Deal movement is a business operation, not a simple update.

Service:

validate stage
 ↓
verify pipeline
 ↓
update deal
 ↓
update status if won/lost
 ↓
create activity
 ↓
audit change
 ↓
trigger automation
 ↓
emit webhook
41. Event Model

Introduce an internal event abstraction:

interface DomainEvent {
  id: string;
  type: string;
  organizationId: ObjectId;
  actorId?: ObjectId;
  entityId?: ObjectId;
  payload: unknown;
  createdAt: Date;
}

Examples:

contact.created
contact.updated

deal.created
deal.stage_changed
deal.won
deal.lost

task.completed
lead.converted

This gives automation, webhooks and notifications a common source of events.

42. Event Processing

For MVP:

Service
 ↓
perform database operation
 ↓
publish domain event
 ↓
event handlers
 ├── audit
 ├── notifications
 ├── automation
 └── webhook

For production reliability, move toward an outbox pattern.

43. Outbox Pattern

Use an outbox_events collection.

interface OutboxEvent {
  _id: ObjectId;

  organizationId: ObjectId;

  type: string;

  payload: unknown;

  status: "pending" | "processing" | "completed" | "failed";

  attempts: number;

  availableAt: Date;

  createdAt: Date;
  processedAt?: Date;
}

Important operations can then be committed atomically:

MongoDB transaction
 ├── Update Deal
 └── Insert Outbox Event

Worker:

Outbox
 ↓
Automation
 ↓
Webhook
 ↓
Notification

This prevents lost events.

44. Automation Architecture

Automation definition:

interface Automation {
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
}

Condition:

interface Condition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "in"
    | "not_in";

  value: unknown;
}
45. Automation Execution

Each run is logged.

interface AutomationRun {
  _id: ObjectId;

  automationId: ObjectId;
  organizationId: ObjectId;

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

This makes automation debuggable.

46. Background Worker

Worker responsibilities:

Outbox events
Import jobs
Export jobs
Automation runs
Webhook retries
Email jobs
Notifications

Architecture:

API Process
     │
     ▼
MongoDB
     │
     ▼
Worker Process

Run API and worker as separate processes from the same codebase.

47. Search

Initial search implementation:

MongoDB indexes
+
MongoDB Atlas Search when available

Create a search service:

interface SearchService {
  searchContacts(...): Promise<SearchResult[]>;
  searchCompanies(...): Promise<SearchResult[]>;
  searchDeals(...): Promise<SearchResult[]>;
}

The UI should never care whether search is MongoDB text search or Atlas Search.

48. Pagination

Use cursor pagination.

Avoid:

skip(100000)

Use:

createdAt + _id

as a stable cursor.

Example:

?limit=50&cursor=...
49. Sorting

Only allow whitelisted sort fields.

Bad:

?sort=${userInput}

Good:

const allowedSortFields = {
  createdAt: "createdAt",
  name: "normalizedName",
  updatedAt: "updatedAt"
};
50. Filtering

Filters should be parsed into a structured representation.

Example:

?status=active
&ownerId=123
&createdAfter=2026-01-01

Complex filters can use:

{
  "filters": [
    {
      "field": "amount",
      "operator": "gte",
      "value": 100000
    }
  ]
}

Never directly translate arbitrary user input into MongoDB operators.

Explicitly whitelist operators.

51. Frontend Routing

Use React Router.

/
├── login
├── register
└── app
    ├── dashboard
    ├── leads
    ├── contacts
    ├── companies
    ├── deals
    ├── pipeline
    ├── tasks
    ├── activities
    ├── reports
    ├── automation
    ├── integrations
    └── settings

Protected routes must verify authentication.

52. Frontend Data Fetching

Use TanStack Query.

Example:

const contactsQuery = useQuery({
  queryKey: ["contacts", filters],
  queryFn: () => contactsApi.list(filters)
});

Mutations invalidate relevant queries.

create contact
 ↓
invalidate ["contacts"]
 ↓
refresh list
53. Frontend Forms

Use:

React Hook Form
+
Zod

Shared schemas can live in:

packages/validation

This allows the frontend and backend to share validation definitions where appropriate.

54. Frontend Permissions

Frontend permissions are for UX only.

Example:

<Can permission="contacts.create">
  <CreateContactButton />
</Can>

But backend authorization remains authoritative.

A hidden button must never be considered a security mechanism.

55. UI Design System

Use the supplied CSS variables as the source of truth.

:root {
  --color-primary: #0F4C81;
  --color-primary-foreground: #FFFFFF;

  --color-accent: #2563EB;
  --color-accent-foreground: #FFFFFF;

  --color-background: #F5F7FA;
  --color-card: #FFFFFF;

  --color-border: #D6DCE5;

  --color-foreground: #1F2937;

  --color-muted: #6B7280;

  --color-success: #15803D;
  --color-warning: #CA8A04;
  --color-danger: #B91C1C;
}

Dark mode remains supported, but the light government-portal theme is the primary design.

56. UI Layout

Application shell:

┌─────────────────────────────────────────────────────┐
│ Header                                              │
├────────────┬────────────────────────────────────────┤
│ Sidebar    │ Main content                           │
│            │                                        │
│ Navigation │ Breadcrumb                             │
│            │                                        │
│            │ Page title                             │
│            │                                        │
│            │ Content                                │
└────────────┴────────────────────────────────────────┘

Avoid nested cards everywhere.

Use cards primarily for meaningful groups of information.

57. Table Architecture

Create a reusable:

<DataTable />

with:

columns
data
pagination
sorting
filters
selection
loading
empty
error

The table component should not know about contacts/deals/etc.

58. Forms Architecture

Create:

FormField
FormLabel
FormError
FormDescription

Then compose domain forms:

ContactForm
CompanyForm
DealForm
LeadForm
TaskForm

Forms should work in:

create mode
edit mode
59. Detail Page Architecture

Use consistent structure:

Page Header
├── title
├── metadata
└── actions

Tabs
├── Overview
├── Activity
├── Deals
├── Tasks
├── Notes
└── Files
60. Notifications

Use server-generated notifications.

Frontend:

GET /notifications
PATCH /notifications/:id/read
POST /notifications/read-all

Polling is acceptable for MVP.

WebSockets/SSE can be introduced later.

61. Real-Time Architecture

Do not introduce WebSockets initially unless required.

Initial:

API
 ↓
TanStack Query
 ↓
refetch/invalidation

Later:

Server
 ↓
SSE/WebSocket
 ↓
Query invalidation
62. Email Architecture

Email must be abstracted:

interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}

Implementation:

services/email/
├── provider.ts
├── templates.ts
└── email.service.ts

Do not hard-code a particular email provider into business modules.

63. Storage Architecture

Abstract storage:

interface StorageProvider {
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
}

This allows:

S3
Cloudflare R2
MinIO
other S3-compatible providers

without changing CRM modules.

64. Integration Architecture

Each integration follows:

Integration
├── metadata
├── OAuth
├── credentials
├── client
├── sync
├── webhook handling
└── disconnect

Interface:

interface IntegrationProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sync(): Promise<void>;
  handleWebhook(payload: unknown): Promise<void>;
}
65. Webhook Security

Every outbound webhook should include:

X-CRM-Event
X-CRM-Event-ID
X-CRM-Timestamp
X-CRM-Signature

Signature:

HMAC-SHA256

Receiver verifies:

signature
+
timestamp tolerance
+
event ID

to prevent replay attacks.

66. API Keys

Store only hashes.

Database:

keyHash

Not:

plainApiKey

Display the full key only once.

67. Authentication Flow

Login:

POST /auth/login
       ↓
validate credentials
       ↓
create session
       ↓
store hashed session token
       ↓
HTTP-only cookie
       ↓
return user

Logout:

cookie
 ↓
resolve session
 ↓
revoke session
 ↓
clear cookie
68. Password Reset

Flow:

Request reset
 ↓
generate random token
 ↓
store hash + expiry
 ↓
send email
 ↓
user submits token
 ↓
validate
 ↓
change password
 ↓
revoke all sessions

Never store reset tokens in plaintext.

69. CSRF

Because authentication uses cookies, state-changing requests need CSRF protection.

Recommended approach:

SameSite=Lax/Strict
+
CSRF token for sensitive state-changing requests

CORS must be explicitly configured.

Never use:

Access-Control-Allow-Origin: *

with credentialed requests.

70. Security Headers

Use appropriate headers such as:

Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
X-Frame-Options
Strict-Transport-Security

Tune CSP according to the actual frontend deployment.

71. Rate Limiting

At minimum:

Login
Password reset
Registration
API
Webhook endpoints

Use stricter limits for authentication endpoints.

72. File Security

Uploads must verify:

extension
MIME type
file size
organization
ownership

Never trust the filename extension alone.

Files should be stored outside the API server filesystem in production.

73. Audit Event Creation

Create a reusable service:

audit.log({
  organizationId,
  actorId,
  action: "deal.stage_changed",
  entityType: "deal",
  entityId,
  before,
  after,
  metadata
});

Audit generation should happen inside service operations, not React.

74. Reports Architecture

Reports should use MongoDB aggregation pipelines.

Example:

Deal collection
 ↓
$match organization
 ↓
$match date range
 ↓
$group by stage
 ↓
$sum amount
 ↓
return report

Do not load all deals into Node.js and calculate reports there.

75. Dashboard Architecture

Dashboard endpoints should return aggregated data.

Example:

GET /api/v1/dashboard/summary

Response:

{
  "data": {
    "pipelineValue": 12450000,
    "openDeals": 42,
    "wonRevenue": 2430000,
    "winRate": 31.4,
    "newLeads": 128,
    "overdueTasks": 17
  }
}
76. Caching

Do not introduce aggressive caching initially.

Cache only where useful:

dashboard aggregates
static configuration
permission metadata
report definitions

Never cache tenant-sensitive responses without tenant-aware keys.

77. Database Transactions

Use MongoDB transactions for:

lead conversion
complex deal transitions
user/role operations involving multiple collections
organization deletion
critical settings changes

Don't use transactions for every simple CRUD operation.

78. Soft Delete Rules

Repositories automatically exclude:

deletedAt: { $exists: false }

Delete service:

authorize
 ↓
set deletedAt
 ↓
audit
 ↓
event

Permanent deletion should be restricted to administrative/data-retention workflows.

79. Duplicate Detection

Contacts:

organizationId + normalized email

Companies:

organizationId + normalized company name

When duplicates are detected, return:

409 DUPLICATE_RESOURCE

or provide a merge workflow.

80. Record Merge

Eventually support:

Contact A
+
Contact B
↓
Primary Contact

The merge service must:

select primary
combine fields
migrate relationships
migrate activities
migrate tasks
preserve audit history
soft-delete duplicate

This should be implemented as a transaction.

81. Import Architecture

Import flow:

Upload
 ↓
Create ImportJob
 ↓
Worker
 ↓
Parse CSV
 ↓
Map fields
 ↓
Validate
 ↓
Batch database writes
 ↓
Record errors
 ↓
Complete job

Use batch writes rather than one MongoDB operation per row.

82. Export Architecture

Export flow:

Request export
 ↓
Create ExportJob
 ↓
Worker
 ↓
Query database
 ↓
Generate CSV
 ↓
Upload storage
 ↓
Create signed URL
 ↓
Notify user

Exports must respect the user's permissions and current filters.

83. CSV Import Rules

The importer must handle:

UTF-8
quoted values
commas inside values
empty cells
duplicate rows
invalid emails
invalid dates
invalid references

Never crash the entire import because of one invalid row.

84. Background Job Retry

Jobs should use:

attempts
backoff
maxAttempts
lastError

Example:

Attempt 1
 ↓
30 seconds
 ↓
Attempt 2
 ↓
2 minutes
 ↓
Attempt 3
 ↓
Failed
85. Observability

Every request gets:

requestId

Logs should be structured JSON.

Example:

{
  "level": "info",
  "requestId": "...",
  "organizationId": "...",
  "userId": "...",
  "method": "POST",
  "path": "/api/v1/deals",
  "status": 201,
  "durationMs": 142
}
86. Health Endpoints

Provide:

GET /health
GET /ready

/health:

process is alive

/ready:

MongoDB reachable
required services available
87. Graceful Shutdown

On SIGTERM:

stop accepting requests
 ↓
finish active requests
 ↓
stop worker
 ↓
close MongoDB
 ↓
exit

Required for containerized deployments.

88. Environment Configuration

Validate environment variables at startup.

Example:

const env = z.object({
  NODE_ENV: z.enum([
    "development",
    "test",
    "production"
  ]),

  PORT: z.coerce.number(),

  MONGODB_URI: z.string().url(),

  MONGODB_DATABASE: z.string(),

  SESSION_SECRET: z.string().min(32),

  CORS_ORIGIN: z.string()
}).parse(process.env);

The application should refuse to start with invalid configuration.

89. Docker

Docker is used only for local development. Production deployment uses Vercel.

For local development:

```text
docker-compose
├── mongodb
├── api
├── worker
└── web
```

Docker files remain in the repository for local development but are not used for production deployment.
90. CI/CD

Pipeline:

Push
 ↓
Install
 ↓
Lint
 ↓
Typecheck
 ↓
Unit tests
 ↓
Integration tests
 ↓
Build
 ↓
Docker build
 ↓
Security scan
 ↓
Deploy

Production deployment should only occur after all required checks pass.

91. Testing Structure
apps/api/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/

apps/web/
└── tests/
    ├── unit/
    └── e2e/

Critical E2E tests:

Authentication
RBAC
Contact CRUD
Lead conversion
Deal pipeline
Task completion
Import
Export
Audit logging
92. API Integration Tests

Every protected endpoint should test:

unauthenticated
wrong organization
insufficient permission
valid request
invalid request
not found
duplicate

This is especially important for multi-tenancy.

93. Multi-Tenancy Security Tests

Create:

Organization A
Organization B

Create records in both.

Then verify:

A cannot read B
A cannot update B
A cannot delete B
A cannot search B
A cannot export B
A cannot access B attachments
A cannot trigger B automations

This should be part of the automated test suite.

94. Frontend Performance

Use:

route-level lazy loading
query caching
pagination
debounced search
virtualization for extremely large lists where required
optimized bundle splitting

Do not render 10,000 CRM records simultaneously.

95. Search Debouncing

Global/list search should debounce input approximately:

250–400 ms

Avoid an API request on every keystroke.

96. Optimistic Updates

Use selectively.

Good candidates:

mark notification read
complete task

Avoid optimistic updates for complex operations such as:

lead conversion
deal stage transitions
bulk deletion

where rollback complexity is high.

97. Frontend Error Boundaries

Use application-level error boundaries.

A broken page should not take down the entire SPA.

Display:

Something went wrong.

Request ID: abc123

[Try Again]

The request ID should correspond to backend logs.

98. Design Tokens

Tailwind should map directly to semantic tokens.

Example:

bg-background
bg-card
bg-primary
text-foreground
text-muted
border-border
text-success
text-warning
text-danger

Components should avoid arbitrary colors wherever possible.

Bad:

className="bg-[#0F4C81]"

Prefer:

className="bg-primary"
99. Component Styling Rules

Primary button:

.btn-primary

Secondary:

.btn-secondary

Danger:

.btn-danger

Input:

.input

Label:

.label

Card:

.card

The supplied design language becomes the application's reusable visual vocabulary.

100. Visual Hierarchy

Pages should generally follow:

Breadcrumb
↓
Page title
↓
Description / metadata
↓
Primary actions
↓
Filters
↓
Main content

Do not put five competing primary buttons on the same screen.

101. Confirmation Rules

Confirmation required for:

permanent deletion
bulk deletion
role changes
user deactivation
disconnect integration
API key revocation

Not required for:

opening pages
saving ordinary edits
marking task complete
102. Accessibility

Every interactive component must support:

keyboard
focus
screen reader labels

Dialogs must:

trap focus
restore focus
close appropriately

Tables must have proper headers.

Forms must associate labels with controls.

103. API Documentation

Generate OpenAPI documentation from route schemas.

Expose in development:

/api/docs

And machine-readable:

/api/openapi.json

Production access can be restricted to administrators/developers.

104. Type Sharing

Shared contracts:

packages/contracts/
├── auth.ts
├── contacts.ts
├── companies.ts
├── leads.ts
├── deals.ts
├── tasks.ts
└── pagination.ts

The goal is:

Frontend
   │
   ├── TypeScript types
   │
   ▼
Shared contracts
   ▲
   │
Backend

However, don't blindly share MongoDB database types with the frontend.

Separate:

Database Model
API DTO
Frontend View Model
105. DTO Pattern

Database:

{
  _id: ObjectId,
  organizationId: ObjectId,
  createdAt: Date
}

API:

{
  id: string,
  createdAt: string
}

This prevents database implementation details from leaking into the public API.

106. API Versioning

All external APIs start at:

/api/v1

Breaking changes should create:

/api/v2

Do not silently break existing API consumers.

107. Idempotency

Implement idempotency for operations that may be retried:

POST /imports
POST /exports
POST /webhooks

Accept:

Idempotency-Key

where appropriate.

108. Webhook Idempotency

Every event has:

eventId

Consumers should be able to safely process the same event twice.

Outbound delivery should record:

eventId
endpoint
attempt
status
responseCode
109. Database Index Creation

Indexes must be version controlled.

Do not rely on someone manually creating them in production.

Create:

apps/api/src/db/indexes.ts

and/or versioned migration scripts.

Startup should verify required indexes exist.

110. Database Backup

Production must have:

automated backups
point-in-time recovery where supported
tested restore procedure

A backup that has never been restored is not considered a verified backup.

111. Data Retention

The system should support configurable retention policies eventually.

Potential policies:

Audit logs
Sessions
Notifications
Webhook delivery logs
Import files
Export files
Deleted records
112. Security Threat Model

Primary threats:

Cross-tenant data access
Credential theft
Session theft
Privilege escalation
XSS
CSRF
NoSQL injection
Malicious file upload
API abuse
Webhook replay
Data leakage through logs
Broken access control

The architecture must specifically test for these.

113. Critical Security Rule

The most important rule in the entire system:

organizationId must never be trusted from the client.

It should come from:

authenticated session
        ↓
user membership
        ↓
organization context

Never:

{
  "organizationId": "..."
}

and then trust that value.

114. Another Critical Rule

Never expose MongoDB queries directly through API filters.

Never allow something resembling:

{
  "$where": "..."
}

or arbitrary Mongo operators from users.

All filters must be transformed from an approved application-level filter language into MongoDB queries.

115. Deployment Topology

Recommended production:

                    Internet
                       │
                       ▼
                ┌─────────────┐
                │ CDN / Proxy │
                └──────┬──────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
    ┌───────────┐             ┌───────────┐
    │ Web       │             │ API       │
    │ Container │             │ Container │
    └───────────┘             └─────┬─────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                   ┌───────────┐        ┌─────────────┐
                   │ MongoDB   │        │ Object      │
                   │ Atlas     │        │ Storage     │
                   └───────────┘        └─────────────┘
                                   
                              ┌─────────────┐
                              │ Worker      │
                              │ Container   │
                              └─────────────┘
116. Scaling Strategy

Initial:

1 API
1 Worker
1 MongoDB cluster

Later:

Load Balancer
     │
 ┌───┼────┐
 ▼   ▼    ▼
API API  API
 │   │    │
 └───┼────┘
     ▼
 MongoDB

The API should remain stateless apart from external persistence/session storage.

117. Module Dependency Rules

Allowed:

routes
 ↓
controller
 ↓
service
 ↓
repository

Not allowed:

repository → controller
controller → MongoDB
React → MongoDB
module A repository → module B repository directly

For cross-module operations:

Module A service
 ↓
Module B service

or domain events where appropriate.

118. Coding Standards

Required:

strict TypeScript
no any unless explicitly justified
ESLint
Prettier
meaningful variable names
small functions
explicit return types for important service functions
no duplicated authorization logic
no direct database access from UI
no secrets in source code

TypeScript:

{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
119. Error Handling Standard

Never expose:

MongoDB error
stack trace
internal query
filesystem path
secret

to users.

Instead:

{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred.",
    "requestId": "req_123"
  }
}

The actual error goes to logs.

120. Implementation Order

This is the order I'd actually build it.

Stage 1 — Foundation
Monorepo
TypeScript
React
Vite
Tailwind
Hono
MongoDB
Shared contracts
Environment config
Logging
Error handling
Docker
CI
Stage 2 — Identity
Organizations
Users
Sessions
Authentication
RBAC
Permissions
Stage 3 — Core CRM
Companies
Contacts
Leads
Lead conversion
Tags
Custom fields
Stage 4 — Sales
Pipelines
Stages
Deals
Deal movement
Activities
Tasks
Notes
Stage 5 — UX
Dashboard
Search
Filtering
Pagination
Bulk actions
Notifications
Stage 6 — Data Operations
Import
Export
Attachments
Audit logs
Stage 7 — Intelligence
Reports
Dashboard analytics
Automation engine
Events
Outbox
Workers
Stage 8 — Integrations
API keys
Webhooks
Email
Calendar
External integrations
Stage 9 — Hardening
Security testing
Performance testing
Multi-tenant testing
E2E testing
Backup/restore
Monitoring
Accessibility
121. First Production Milestone

The first truly usable release should stop at:

┌─────────────────────────────────────┐
│             CRM CORE                │
├─────────────────────────────────────┤
│ Authentication                      │
│ Organizations                       │
│ Users + RBAC                        │
│                                     │
│ Companies                           │
│ Contacts                            │
│ Leads                               │
│ Lead Conversion                     │
│                                     │
│ Pipelines                           │
│ Deals                               │
│ Activities                          │
│ Tasks                               │
│ Notes                               │
│                                     │
│ Dashboard                           │
│ Search                              │
│ Filtering                           │
│ Import / Export                     │
│ Audit Logs                          │
└─────────────────────────────────────┘

Then automation and integrations should be built on top of the event architecture, rather than bolted onto the CRUD system later.

122. Definition of Technical Completion

The system is technically production-ready when:

✓ Strict TypeScript
✓ No critical type errors
✓ All API inputs validated
✓ All API routes authorized
✓ Multi-tenant isolation tested
✓ Authentication hardened
✓ RBAC tested
✓ MongoDB indexes deployed
✓ Transactions used where required
✓ Audit trail implemented
✓ Background jobs operational
✓ Import/export reliable
✓ Error handling standardized
✓ Structured logging implemented
✓ Health checks available
✓ Automated backups configured
✓ Restore procedure tested
✓ Unit tests passing
✓ Integration tests passing
✓ E2E critical paths passing
✓ Security tests passing
✓ Accessibility reviewed
✓ Production build reproducible
✓ CI/CD automated
123. The Key Architectural Decision

The most important thing I'd preserve throughout implementation is this:

                       ┌──────────────┐
                       │    React     │
                       └──────┬───────┘
                              │
                         REST API
                              │
                       ┌──────▼───────┐
                       │    Hono      │
                       └──────┬───────┘
                              │
                     ┌────────▼────────┐
                     │ Domain Services │
                     └────────┬────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
         Repository       Event Bus        External
              │               │             Services
              ▼               ▼
          MongoDB          Workers
                              │
                ┌─────────────┼──────────────┐
                ▼             ▼              ▼
             Audit        Automation      Webhooks

React is the presentation layer. Hono is the API layer. Services own business rules. Repositories own persistence. Events connect asynchronous functionality. MongoDB is persistence, not the business-logic layer.
