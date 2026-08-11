Software Requirements Specification — CRM Platform

Document Version: 1.0
Status: Product/Engineering Baseline
Architecture: Full-stack TypeScript
Frontend: React + TypeScript + Tailwind CSS
Backend: Hono + TypeScript
Database: MongoDB
Authentication: Session/token-based authentication with secure cookie strategy
API: REST/JSON
UI Style: Minimal government/public-sector portal
Primary Font: JetBrains Mono
Deployment: Containerized, production-ready

1. Product Overview
1.1 Purpose

The system shall provide a complete multi-tenant Customer Relationship Management platform allowing organizations to manage:

Leads
Contacts
Companies/accounts
Sales opportunities
Sales pipelines
Tasks
Activities
Notes
Meetings
Communication history
Users
Teams
Roles and permissions
Reports
Dashboards
Automations
Integrations
Imports/exports
Audit history

The platform shall support organizations ranging from small businesses to larger sales teams.

2. Product Principles

The product shall follow these principles:

2.1 Simplicity

The UI should prioritize:

information density + clarity + predictable navigation

over decorative UI.

2.2 Reliability

Every important business operation should have:

validation
authorization
error handling
auditability
predictable state transitions
2.3 Multi-tenancy

Every organization operates within an isolated tenant.

No request may access another organization's data.

2.4 API-first architecture

The frontend shall communicate with the backend exclusively through documented APIs.

Business logic must not live inside React components.

2.5 Extensibility

The system should support future:

integrations
custom fields
automation
reporting
APIs
enterprise functionality

without requiring major schema redesign.

3. Technology Stack
3.1 Frontend

Required:

TypeScript
React
React Router
Tailwind CSS
TanStack Query
React Hook Form
Zod
Lucide React

Recommended:

Vite
TanStack Table
Recharts
date-fns

The frontend shall use a centralized API client rather than direct fetch() calls throughout the application.

4. Backend

Required:

TypeScript
Hono
MongoDB
MongoDB Node.js driver

Recommended:

Zod for request validation
Pino for structured logging
Vitest for unit testing
OpenAPI generation/documentation

Backend architecture:

src/
├── app.ts
├── server.ts
│
├── config/
├── middleware/
│
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── users/
│   ├── contacts/
│   ├── companies/
│   ├── leads/
│   ├── deals/
│   ├── pipelines/
│   ├── activities/
│   ├── tasks/
│   ├── notes/
│   ├── reports/
│   ├── automations/
│   ├── integrations/
│   ├── imports/
│   ├── exports/
│   └── audit/
│
├── db/
├── services/
├── utils/
└── types/

Each module should follow:

module/
├── routes.ts
├── service.ts
├── repository.ts
├── schema.ts
├── types.ts
└── index.ts

Routes handle HTTP.

Services handle business logic.

Repositories handle persistence.

5. Database

MongoDB shall be used as the primary persistence layer.

Major collections:

organizations
users
teams
roles
permissions

contacts
companies
leads

pipelines
pipeline_stages
deals

activities
tasks
notes
attachments

custom_fields
custom_field_values

notifications

automations
automation_executions

integrations
webhooks
api_keys

imports
exports

audit_logs

sessions
6. Multi-Tenant Architecture

Every tenant-owned document must contain:

organizationId: ObjectId

Example:

interface Contact {
  _id: ObjectId;
  organizationId: ObjectId;

  firstName: string;
  lastName?: string;

  email?: string;
  phone?: string;

  companyId?: ObjectId;
  ownerId?: ObjectId;

  status: string;

  tags: string[];

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;

  deletedAt?: Date;
}

Every repository query must scope by:

{
  organizationId,
  ...
}

This should be enforced through the repository/service architecture rather than relying on individual developers remembering to add the filter.

7. Authentication

The system shall support:

Registration
Login
Logout
Password reset
Email verification
Session management
Change password
Account lockout/rate limiting
Optional MFA

Authentication shall use secure HTTP-only cookies.

Passwords must never be stored in plaintext.

Use a modern password hashing algorithm such as Argon2id.

8. Authorization

The system shall implement RBAC.

Default roles:

System Administrator

Full organization access.

Manager

Can manage:

users within permitted scope
contacts
companies
leads
deals
reports
teams
Sales Representative

Can manage assigned:

contacts
leads
deals
tasks
activities
Viewer

Read-only access.

9. Permission Model

Permissions should be granular.

Example:

contacts.read
contacts.create
contacts.update
contacts.delete
contacts.export

companies.read
companies.create
companies.update
companies.delete

deals.read
deals.create
deals.update
deals.delete
deals.export

users.read
users.create
users.update
users.delete

reports.read
reports.create

settings.manage
audit_logs.read

The authorization middleware shall verify:

authenticated user
        ↓
organization membership
        ↓
role
        ↓
permission
        ↓
resource ownership/scope
10. Application Navigation

Primary navigation:

Dashboard

CRM
├── Leads
├── Contacts
├── Companies
└── Deals

Sales
├── Pipeline
├── Activities
└── Tasks

Reports

Automation

Integrations

Administration
├── Users
├── Teams
├── Roles & Permissions
├── Custom Fields
├── Pipelines
├── Audit Log
└── Organization Settings

The sidebar should be compact and functional.

No excessive gradients, floating cards, glassmorphism, or decorative illustrations.

11. Dashboard

Dashboard shall provide configurable widgets.

Default widgets:

Sales pipeline
Pipeline Value
₹12,450,000
Open deals
42
Won this month
₹2,430,000
Win rate
31.4%
New leads
128
Overdue tasks
17
Recent activity

Timeline of recent CRM events.

Pipeline chart

Display deal distribution by stage.

Sales performance

Display:

Salesperson
Deals
Won
Revenue
Win Rate

Dashboard data must respect the current user's permissions.

12. Contacts
12.1 Contact fields

Required:

First Name
Last Name
Email
Phone
Company
Job Title
Owner
Status
Tags
Source
Address
Notes

Optional:

LinkedIn
Website
Date of Birth
Custom Fields
13. Contact List

The list shall support:

Search
Pagination
Sorting
Filtering
Column selection
Bulk selection
Bulk delete/archive
Bulk assignment
Export

Example:

CONTACTS
──────────────────────────────────────────────────────────

[ Search contacts... ]     [Filters] [Columns] [+ Contact]

Name             Company       Email          Owner     Status
──────────────────────────────────────────────────────────
John Smith       Acme Ltd      john@acme.com  A. Singh  Active
Sarah Jones      Globex        sarah@...      R. Kumar  Lead
14. Contact Details

The contact detail page shall contain:

Contact Header

John Smith
Senior Manager
Acme Corporation

[Edit] [Create Deal] [Log Activity]

────────────────────────────────────

Overview
Activity
Deals
Tasks
Notes
Files

Activity timeline:

07 Aug 2026
────────────────────────
Email sent
"Proposal follow-up"

06 Aug 2026
────────────────────────
Meeting
Product demonstration

04 Aug 2026
────────────────────────
Deal created
₹850,000
15. Companies

Companies represent organizations/accounts.

Fields:

Company Name
Industry
Website
Phone
Email
Address
Country
Employees
Annual Revenue
Owner
Status
Tags
Description

Company page shall show:

Contacts
Deals
Activities
Tasks
Notes
Files
Timeline
16. Leads

Lead lifecycle:

New
↓
Contacted
↓
Qualified
↓
Unqualified
↓
Converted

Lead fields:

Name
Email
Phone
Company
Source
Status
Owner
Score
Description
Created Date

Lead sources:

Website
Referral
Advertisement
Cold Call
Email
Social
Partner
Import
Other
17. Lead Conversion

A lead may be converted.

Conversion shall optionally create:

Lead
 ↓
Contact
 +
Company
 +
Deal

The user should be able to select:

Create Contact     ✓
Create Company     ✓
Create Deal        ✓

Pipeline: Default
Stage: Qualified
Deal Value: ₹500,000

Converted leads must remain auditable.

18. Deals

Deal fields:

Deal Name
Company
Primary Contact
Pipeline
Stage
Amount
Currency
Probability
Expected Close Date
Owner
Source
Description
19. Pipeline

Pipeline view:

NEW
────────────────
Deal A     ₹50k
Deal B     ₹30k

QUALIFIED
────────────────
Deal C     ₹90k

PROPOSAL
────────────────
Deal D     ₹120k

NEGOTIATION
────────────────
Deal E     ₹200k

Users with permission can drag deals between stages.

Stage changes must generate an activity/audit event.

20. Pipeline Configuration

Administrators can create multiple pipelines.

Example:

Enterprise Sales

New
Qualified
Discovery
Proposal
Negotiation
Won
Lost

Another:

SMB Sales

New
Contacted
Demo
Proposal
Won
Lost

Pipeline stages shall contain:

{
  name: string;
  order: number;
  probability: number;
  color?: string;
  isWon: boolean;
  isLost: boolean;
}
21. Activities

Activity types:

Call
Email
Meeting
Demo
Follow-up
Note
Other

Each activity should support:

Type
Subject
Description
Date
Duration
Owner
Related Contact
Related Company
Related Deal
22. Tasks

Task fields:

Title
Description
Due Date
Priority
Status
Assigned User
Related Contact
Related Company
Related Deal

Priorities:

Low
Medium
High
Urgent

Statuses:

Open
In Progress
Completed
Cancelled

Tasks shall support:

reminders
overdue detection
completion
reassignment
23. Calendar

Calendar shall display:

Tasks
Meetings
Follow-ups

Views:

Month
Week
Day
Agenda

Calendar integrations can be added later, but the internal calendar must function independently.

24. Notes

Notes can be attached to:

Contacts
Companies
Leads
Deals

Notes shall support:

title
body
author
timestamps
editing
deletion
audit trail
25. Attachments

Supported attachments:

PDF
DOC/DOCX
XLS/XLSX
CSV
PNG
JPG/JPEG
TXT

The system must:

validate MIME type
validate file size
generate secure storage references
prevent executable uploads
enforce organization ownership
audit uploads/deletions

Object storage should be used for production deployments rather than storing large files directly in MongoDB.

26. Global Search

Search shall cover:

Contacts
Companies
Leads
Deals
Tasks

Search results should be grouped:

SEARCH RESULTS
────────────────────

CONTACTS
John Smith
Sarah Smith

COMPANIES
Smith Industries

DEALS
Smith Industries — Expansion
27. Filters

Every major list should support filters.

Example:

Owner = John
Status = Active
Industry = Technology
Created = Last 30 days
Deal Value > ₹100,000

Filters should support combinations:

AND
OR

Saved filters should be supported.

28. Bulk Operations

Supported operations:

Assign
Delete/archive
Change status
Add tags
Remove tags
Export

Bulk operations must provide confirmation and report failures.

29. Import

The system shall support CSV imports.

Flow:

Upload CSV
    ↓
Analyze columns
    ↓
Map fields
    ↓
Preview
    ↓
Validate
    ↓
Import
    ↓
Result

Example:

IMPORT RESULT

49,327 imported
312 updated
47 failed

[Download Error Report]

Imports must run asynchronously for large files.

30. Export

Users with permission can export:

Contacts
Companies
Leads
Deals
Activities
Tasks
Reports

Exports should respect:

organization
permission
filters
selected columns
31. Custom Fields

Administrators shall be able to create custom fields for:

Contacts
Companies
Leads
Deals

Types:

Text
Long Text
Number
Currency
Date
DateTime
Boolean
Select
Multi-select
Email
Phone
URL

Example:

Customer Tier
[ Enterprise ▼ ]

Contract Renewal Date
[ 31/12/2026 ]

Annual Contract Value
[ ₹1,250,000 ]
32. Tags

Users can create organization-level tags.

Examples:

VIP
Enterprise
Hot Lead
Renewal
Partner
High Value

Tags should be usable in filters and reports.

33. Notifications

Notifications shall support:

Task assigned
Task overdue
Deal assigned
Deal stage changed
Mention
Automation result
System notification

Notification center:

🔔 Notifications

3 new notifications

Deal assigned to you
Acme Expansion — ₹800k

Task overdue
Follow up with John Smith

Pipeline updated
34. Automation Engine

The automation engine should follow:

Trigger
   ↓
Conditions
   ↓
Actions

Triggers:

Contact created
Lead created
Deal created
Deal stage changed
Task overdue
Date reached

Conditions:

Deal amount > 100000
Owner = X
Stage = Proposal
Industry = Technology

Actions:

Assign user
Create task
Change status
Add tag
Send email
Create notification
Webhook

Example:

WHEN
Deal enters "Proposal"

IF
Deal amount > ₹500,000

THEN
Create task:
"Manager review required"

AND
Notify Sales Manager

Every automation execution must be logged.

35. Email

Email integration should support:

OAuth connection
Send email
Receive/log email where supported
Email history
Templates
Tracking where legally appropriate

Emails must be associated with CRM records.

36. Integrations

Architecture should support pluggable integrations.

Initial integration framework:

Integration
├── Provider
├── OAuth
├── Credentials
├── Webhooks
├── Events
└── Sync

Future providers:

Google
Microsoft
Slack
Teams
Accounting
Marketing
Telephony
37. REST API

Base:

/api/v1

Resources:

/auth
/organizations
/users
/teams
/contacts
/companies
/leads
/deals
/pipelines
/activities
/tasks
/notes
/reports
/automations
/integrations
/imports
/exports
/audit-logs

API responses should use a consistent structure.

Success:

{
  "data": {},
  "meta": {}
}

Error:

{
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact was not found"
  }
}
38. API Pagination

Use cursor-based pagination for large collections.

Example:

GET /api/v1/contacts?limit=50&cursor=abc123

Response:

{
  "data": [],
  "meta": {
    "nextCursor": "xyz789",
    "hasMore": true
  }
}
39. API Rate Limiting

Rate limits shall exist for:

authentication
password reset
public endpoints
API keys
general API traffic

Rate limit responses:

HTTP 429
40. API Keys

Administrators can generate API keys.

Each key:

Name
Created
Last Used
Scopes
Status

Keys must only be shown in full once.

Support revocation.

41. Webhooks

Organizations can register webhooks.

Example:

POST https://example.com/crm-webhook

Events:

contact.created
contact.updated
deal.created
deal.updated
deal.stage_changed
deal.won
deal.lost
task.created
task.completed

Webhook delivery should include:

retry
signature
timestamp
event ID
delivery status
42. Audit Logging

Every sensitive operation shall generate an audit event.

Examples:

USER_CREATED
USER_DELETED
CONTACT_CREATED
CONTACT_UPDATED
CONTACT_DELETED

DEAL_CREATED
DEAL_UPDATED
DEAL_STAGE_CHANGED

ROLE_CHANGED
PERMISSION_CHANGED

API_KEY_CREATED
API_KEY_REVOKED

EXPORT_CREATED
IMPORT_CREATED

Audit log:

Timestamp
Actor
Action
Resource
Resource ID
Changes
IP Address
User Agent
43. Reporting

Initial reports:

Sales pipeline
Pipeline
Stage
Deal Count
Deal Value
Sales performance
User
Deals
Won
Lost
Revenue
Win Rate
Lead conversion
Source
Leads
Qualified
Converted
Conversion Rate
Activity report
User
Calls
Emails
Meetings
Tasks

Reports shall support:

date ranges
filters
export
44. Security Requirements

The application shall implement:

HTTPS in production
HTTP-only authentication cookies
Secure cookies
SameSite protection
CSRF protection where applicable
XSS protection
MongoDB injection protection
rate limiting
password hashing
authorization middleware
input validation
output sanitization where needed
secure headers
file upload validation
audit logging
session revocation

No frontend authorization shall be trusted.

The backend must enforce all permissions.

45. Data Protection

The system should support:

account deletion
data export
soft deletion
retention policies
audit retention
backup
restore

Sensitive values must not appear in application logs.

46. UI Design System

The UI shall follow the supplied design system.

Core colors:

--color-primary: #0F4C81;
--color-primary-foreground: #FFFFFF;

--color-accent: #2563EB;
--color-accent-foreground: #FFFFFF;

--color-background: #F5F7FA;
--color-card: #FFFFFF;

--color-border: #D6DCE5;

--color-foreground: #1F2937;

--color-muted: #6B7280;
--color-muted-foreground: #6B7280;

--color-success: #15803D;
--color-warning: #CA8A04;
--color-danger: #B91C1C;

Typography:

JetBrains Mono

The visual language should resemble a professional government/public-sector administrative portal.

47. UI Rules

Use:

rectangular layouts
restrained border radius
strong borders
high information density
clear labels
compact tables
simple forms
predictable navigation
minimal animation

Avoid:

gradients
glassmorphism
excessive shadows
oversized rounded cards
giant hero sections
unnecessary illustrations
excessive whitespace
flashy animations
48. Component Library

Required reusable components:

Button
Input
Textarea
Select
MultiSelect
Checkbox
Radio
Switch
DatePicker
DateRangePicker
Modal
Drawer
Dropdown
Tooltip
Badge
Alert
Toast
Tabs
Card
Table
Pagination
Breadcrumb
Sidebar
Navbar
CommandMenu
EmptyState
LoadingState
ErrorState
ConfirmDialog
Form
Timeline
Avatar
FileUpload
DataFilter
49. Tables

Tables are a core component.

Requirements:

server-side pagination
sorting
filtering
column visibility
row selection
bulk actions
loading state
empty state
error state

Example:

┌───────────────────────────────────────────────────────────┐
│ CONTACTS                                                  │
├───────────────────────────────────────────────────────────┤
│ Search...     Filters ▼     Columns ▼       + Add Contact │
├────┬──────────────┬────────────┬────────────┬─────────────┤
│ □  │ Name         │ Company    │ Owner      │ Status      │
├────┼──────────────┼────────────┼────────────┼─────────────┤
│ □  │ John Smith   │ Acme       │ A. Singh   │ Active      │
│ □  │ Sarah Jones  │ Globex     │ R. Kumar   │ Lead        │
└────┴──────────────┴────────────┴────────────┴─────────────┘
50. Forms

All forms shall use:

schema validation
inline validation
clear labels
required-field indicators
server error handling
loading states
unsaved-change protection where appropriate

Example:

CREATE CONTACT

First Name *
[________________]

Last Name
[________________]

Email
[________________]

Phone
[________________]

Company
[ Select company ]

Owner
[ Select owner ]

                    [Cancel] [Create Contact]
51. Accessibility

Target:

WCAG 2.2 AA

Requirements:

keyboard navigation
visible focus states
semantic HTML
accessible labels
appropriate ARIA
sufficient contrast
screen-reader compatibility
no keyboard traps
52. Responsive Design

The application shall support:

Desktop
Tablet
Mobile

Desktop is the primary target because CRM workflows are information-heavy.

Mobile shall provide functional access rather than simply shrinking desktop layouts.

53. Error Handling

All pages need:

Loading
Loading contacts...
Empty
No contacts found.

[Create Contact]
Error
Unable to load contacts.

[Try Again]
Permission
You do not have permission to access this resource.
54. Backend Error Model

Errors shall use standardized codes.

Examples:

AUTH_REQUIRED
INVALID_CREDENTIALS
FORBIDDEN
RESOURCE_NOT_FOUND
VALIDATION_ERROR
DUPLICATE_RESOURCE
RATE_LIMITED
INTERNAL_ERROR

HTTP status codes must be meaningful.

55. Logging & Monitoring

Production backend shall log:

request ID
method
path
response status
duration
user ID where available
organization ID where available
error information

Never log:

passwords
session tokens
API secrets
OAuth tokens
sensitive personal information unnecessarily
56. Performance Requirements

Target:

Frontend

Initial application load:

< 3 seconds on a normal broadband connection.

API

Normal CRUD requests:

< 500 ms under normal production load.

Search

Typical search:

< 1 second.

Large tables

Never load thousands of records into the browser unnecessarily.

Use:

server filtering
server sorting
server pagination
57. MongoDB Indexing

Indexes should exist for common access patterns.

Examples:

organizationId

organizationId + email
organizationId + ownerId
organizationId + createdAt

organizationId + status
organizationId + companyId

organizationId + pipelineId
organizationId + stageId

organizationId + dueDate
organizationId + assignedTo

Indexes should be created based on actual query patterns and reviewed as the application grows.

58. Soft Delete

Business records should generally use:

deletedAt?: Date

rather than immediately deleting records.

Default queries exclude deleted documents.

Administrators may have access to a recovery/archive interface where appropriate.

59. Data Relationships

The logical relationship model:

Organization
│
├── Users
│   └── Teams
│
├── Companies
│   └── Contacts
│
├── Leads
│
├── Pipelines
│   └── Stages
│
├── Deals
│   ├── Company
│   ├── Contact
│   └── Pipeline Stage
│
├── Activities
│
├── Tasks
│
├── Notes
│
├── Automations
│
├── Integrations
│
└── Audit Logs
60. Data Consistency

Business operations involving multiple records must be handled carefully.

For example, lead conversion:

BEGIN
    Create Contact
    Create Company
    Create Deal
    Mark Lead Converted
COMMIT

Where MongoDB transaction support is available, use transactions for operations requiring atomicity.

61. Frontend Architecture

Recommended:

src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   └── layouts/
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   └── crm/
│
├── features/
│   ├── auth/
│   ├── contacts/
│   ├── companies/
│   ├── leads/
│   ├── deals/
│   ├── tasks/
│   ├── reports/
│   └── settings/
│
├── hooks/
├── lib/
├── api/
├── types/
└── pages/

Feature-specific code should stay inside its feature.

62. State Management

Use:

TanStack Query

For server state:

contacts
companies
deals
users
reports
React state

For local UI state:

modal open
selected rows
form state
sidebar state

Do not put all server data into a global Redux-style store unnecessarily.

63. API Client

Frontend should use a centralized API layer:

contactsApi.list()
contactsApi.get(id)
contactsApi.create(data)
contactsApi.update(id, data)
contactsApi.delete(id)

React components should not contain raw API URLs.

64. Environment Configuration

Frontend:

VITE_API_URL

Backend:

PORT
MONGODB_URI
MONGODB_DATABASE
SESSION_SECRET
COOKIE_DOMAIN
CORS_ORIGIN
STORAGE_ENDPOINT
STORAGE_BUCKET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY

Secrets must never be committed to Git.

65. Testing

Testing shall exist at three levels.

Unit tests

Test:

services
validation
permissions
business rules
calculations
Integration tests

Test:

API routes
database operations
authentication
authorization
E2E tests

Test critical workflows:

Register
→ Login
→ Create company
→ Create contact
→ Create lead
→ Convert lead
→ Create deal
→ Move deal
→ Complete task
→ View report
66. Critical Acceptance Tests

The following workflow must work completely:

Sales workflow
Create Lead
      ↓
Assign Salesperson
      ↓
Qualify Lead
      ↓
Convert Lead
      ↓
Create Contact + Company
      ↓
Create Deal
      ↓
Move Deal through Pipeline
      ↓
Create Follow-up Task
      ↓
Complete Task
      ↓
Mark Deal Won
      ↓
Revenue reflected in Dashboard
      ↓
Audit trail created

If any part of this workflow requires manually editing the database or using an unrelated admin function, the product isn't considered complete.

67. Deployment

Production architecture:

                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Reverse Proxy│
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌──────────────┐         ┌──────────────┐
       │ React/Vite   │         │ Hono API     │
       │ Frontend     │         │ Backend      │
       └──────────────┘         └──────┬───────┘
                                       │
                         ┌─────────────┼──────────────┐
                         ▼             ▼              ▼
                    ┌─────────┐   ┌─────────┐   ┌──────────┐
                    │ MongoDB │   │ Storage │   │ External │
                    │         │   │         │   │ Services │
                    └─────────┘   └─────────┘   └──────────┘
68. Background Jobs

Some operations must not block HTTP requests:

large imports
exports
email sending
automation execution
webhook retries
report generation
notifications

The architecture should therefore include a background-job mechanism.

For the initial implementation, this can be a dedicated worker process backed by MongoDB or a Redis-compatible queue if infrastructure permits.

69. Auditability Requirements

The following operations are mandatory audit events:

Login
Logout
User creation
User deletion
Role changes
Permission changes
Contact creation/update/deletion
Company creation/update/deletion
Lead conversion
Deal creation/update/deletion
Deal stage change
Export
Import
API key creation/revocation
Integration connection/disconnection
Settings changes
70. Search Architecture

Initial implementation may use MongoDB indexes and text search.

As data volume increases, the architecture should allow migration to:

MongoDB Atlas Search
Elasticsearch/OpenSearch

without changing the frontend API.

71. Internationalization

The architecture should not hard-code text throughout components.

Prepare for:

English
Hindi
other languages

Currency should support:

INR
USD
EUR
GBP

Dates must be stored in UTC and displayed using the organization's/user's timezone.

72. Organization Settings

Organization administrators can configure:

Organization Name
Logo
Timezone
Currency
Date Format
Language
Fiscal Year
Default Pipeline
Default Lead Status
Default Deal Probability
73. User Preferences

Users can configure:

Name
Profile photo
Timezone
Language
Date format
Notification preferences
Default dashboard
Default table columns
74. Administration Dashboard

Administrators should see:

Organization

Users       24
Contacts    12,430
Companies   2,183
Deals       642

Storage     14.2 GB

API Usage
Imports
Exports
Recent Audit Events
75. Security Architecture

The backend request lifecycle should look approximately like:

HTTP Request
     ↓
Request ID
     ↓
Rate Limit
     ↓
Authentication
     ↓
Organization Resolution
     ↓
Authorization
     ↓
Validation
     ↓
Controller
     ↓
Service
     ↓
Repository
     ↓
MongoDB

This separation is important.

Do not allow:

React
 ↓
MongoDB

or:

React
 ↓
business logic
 ↓
random API endpoint
76. Definition of Done

A feature is considered complete only when:

UI implemented
API implemented
validation implemented
authorization implemented
database operations implemented
loading state implemented
empty state implemented
error state implemented
audit requirements handled
tests written
responsive behavior verified
accessibility checked
documentation updated
77. MVP vs Full Product

I would not attempt to build everything in the SRS simultaneously.

The implementation should be staged.

Release 1 — Core CRM
Authentication
Organizations
Users
RBAC

Contacts
Companies
Leads

Deals
Pipelines
Activities
Tasks
Notes

Dashboard
Search
Filtering
Pagination
Audit Logs
Release 2 — Operational CRM
Custom Fields
Tags
Import
Export
Notifications
Calendar
Attachments
Reports
Bulk Operations
Release 3 — Automation
Automation Engine
Email
Webhooks
API Keys
Public API
Integrations
Background Jobs
Release 4 — Enterprise
MFA
SSO
SAML
SCIM
Advanced RBAC
Teams
Territories
Advanced Analytics
Data Retention
Enterprise Audit
78. Recommended Route Structure

Frontend:

/login
/register
/forgot-password

/dashboard

/leads
/leads/:id

/contacts
/contacts/:id

/companies
/companies/:id

/deals
/deals/:id

/pipeline

/activities
/tasks
/calendar

/reports

/automation

/integrations

/settings
/settings/organization
/settings/users
/settings/teams
/settings/roles
/settings/custom-fields
/settings/pipelines
/settings/audit-log
/settings/api
79. Recommended API Structure
/api/v1/auth/*
/api/v1/organizations/*
/api/v1/users/*
/api/v1/teams/*
/api/v1/roles/*

/api/v1/contacts/*
/api/v1/companies/*
/api/v1/leads/*

/api/v1/deals/*
/api/v1/pipelines/*

/api/v1/activities/*
/api/v1/tasks/*
/api/v1/notes/*

/api/v1/reports/*
/api/v1/automations/*

/api/v1/imports/*
/api/v1/exports/*

/api/v1/integrations/*
/api/v1/webhooks/*

/api/v1/audit-logs/*
80. MongoDB Collection Baseline

A reasonable initial schema set:

organizations
users
sessions
roles
permissions
teams
team_members

contacts
companies
leads

pipelines
pipeline_stages
deals

activities
tasks
notes
attachments
tags

custom_fields

notifications

automations
automation_runs

integrations
api_keys
webhooks
webhook_deliveries

imports
exports

audit_logs

Don't create collections merely because they're listed here. Some small concepts can be embedded or represented differently depending on actual access patterns.

81. Visual Direction

The overall interface should look closer to:

┌─────────────────────────────────────────────────────────────┐
│ CRM SYSTEM                              User ▼              │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│ Dashboard    │ CONTACTS                                     │
│              │                                              │
│ CRM          │ [Search................] [Filters] [+ Add]   │
│  Leads       │                                              │
│  Contacts    │ ┌──────────────────────────────────────────┐ │
│  Companies   │ │ □ Name       Company      Owner  Status │ │
│  Deals       │ ├──────────────────────────────────────────┤ │
│              │ │ □ John Smith Acme         Singh  Active │ │
│ Sales        │ │ □ Sarah     Globex       Kumar  Lead   │ │
│  Pipeline    │ │ □ Michael   Contoso      Singh  Active │ │
│  Tasks       │ └──────────────────────────────────────────┘ │
│  Activities  │                                              │
│              │                                              │
│ Reports      │                                              │
│              │                                              │
│ Admin        │                                              │
│  Users       │                                              │
│  Settings    │                                              │
└──────────────┴──────────────────────────────────────────────┘

Think government administrative portal, not SaaS startup landing page.

82. Important Engineering Rule

I would make one architectural requirement explicit:

The CRM must be domain-driven rather than page-driven.

Bad:

ContactPage.tsx
    ├── API
    ├── validation
    ├── business logic
    └── database assumptions

Better:

contacts/
├── frontend
│   ├── components
│   ├── hooks
│   └── pages
│
└── backend
    ├── routes
    ├── service
    ├── repository
    ├── schema
    └── types

That becomes extremely important once you add automation, APIs, imports, integrations and reporting.

83. Final Product Standard

The finished product should satisfy this definition:

A multi-tenant CRM platform in which an organization can onboard users, define permissions and sales pipelines, manage leads/contacts/companies, convert leads into opportunities, manage deals through pipelines, record customer interactions, schedule tasks, search/filter/export data, automate repetitive workflows, generate reports, integrate external systems, and maintain a complete security/audit trail—all through a consistent, accessible, production-grade interface.

And I would consider these non-negotiable before calling it production-ready:

✓ Multi-tenancy
✓ RBAC
✓ Backend authorization
✓ Secure authentication
✓ Contacts
✓ Companies
✓ Leads
✓ Lead conversion
✓ Deals
✓ Multiple pipelines
✓ Activities
✓ Tasks
✓ Search
✓ Filtering
✓ Pagination
✓ Import/export
✓ Custom fields
✓ Audit logs
✓ Reports
✓ Notifications
✓ API
✓ Webhooks
✓ Error handling
✓ Validation
✓ Tests
✓ Backups
✓ Monitoring
✓ Responsive UI
✓ Accessibility
