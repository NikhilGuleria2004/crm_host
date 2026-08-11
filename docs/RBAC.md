RBAC Specification Document
Industry-Ready CRM

Document: Role-Based Access Control Specification
Version: 1.0
Status: Implementation Ready
Stack: TypeScript, React, Hono, MongoDB
Authentication: Session/token based authentication
Authorization model: RBAC + organization scoping + record visibility rules

1. Purpose

This document defines the authorization model for the CRM.

The system must answer two separate questions for every request:

Can this user perform this action?
Can this user perform it on this particular record?

For example:

A sales representative may have permission to edit deals, but only deals they own or deals belonging to their assigned team.

Therefore, the authorization model consists of:

Authentication
      ↓
Organization Membership
      ↓
Role
      ↓
Permission
      ↓
Resource Scope
      ↓
Authorization Decision
2. Core Security Principles

The system MUST follow these principles.

2.1 Default deny

If a permission is not explicitly granted:

DENY

Never assume access because a user is authenticated.

2.2 Server-side authorization

React permissions are only for UI behavior.

The backend MUST independently verify authorization.

Incorrect:

if (user.role === "admin") {
   showDeleteButton();
}

Correct:

DELETE /api/contacts/:id
        ↓
authenticate()
        ↓
authorize("contacts.delete")
        ↓
checkRecordScope()
        ↓
delete()
2.3 Organization isolation

Every business record belongs to an organization.

A user must never be able to access another organization's:

contacts
companies
leads
deals
tasks
activities
files
reports
users
settings
API keys
webhooks

Even if the attacker knows the MongoDB _id.

2.4 No client-controlled authorization

Never trust:

{
  "role": "admin"
}

sent from the frontend.

Role and permissions must come from the authenticated server-side identity.

3. Authorization Model

The authorization system uses:

RBAC
+
Organization Scope
+
Ownership Scope
+
Team Scope
+
Optional Record-Level Access

The resulting decision is:

ALLOW =
authenticated
AND organizationMember
AND hasPermission
AND withinScope
4. Organizations

An organization is the primary security boundary.

Example:

Organization A
├── Users
├── Contacts
├── Companies
├── Leads
├── Deals
├── Tasks
└── Reports

Organization B
├── Users
├── Contacts
├── Companies
├── Leads
├── Deals
└── Tasks

There must be no cross-organization access.

5. Users

A user can belong to one or more organizations.

Recommended model:

User
│
├── identity
│
└── memberships[]
      ├── organizationId
      ├── roleId
      ├── status
      └── teamIds[]

Example:

{
  "userId": "user_123",
  "memberships": [
    {
      "organizationId": "org_acme",
      "roleId": "role_sales",
      "status": "active",
      "teamIds": ["team_north"]
    }
  ]
}
6. User Membership Status

Allowed values:

invited
active
suspended
removed
invited

User has been invited but has not completed onboarding.

Permissions:

NONE
active

Normal access.

suspended

Authentication may remain identifiable, but organization access is denied.

removed

Membership no longer exists for authorization purposes.

7. Roles

The system should ship with these default roles:

Owner
Administrator
Sales Manager
Sales Representative
Support Agent
Viewer

Organizations should be able to create custom roles.

8. Owner

The organization owner has unrestricted organization-level administrative access.

Permissions:

*

Except certain dangerous platform-level operations which should remain inaccessible to normal organization users.

Owner can:

manage organization
manage users
manage roles
manage permissions
manage integrations
manage API keys
manage webhooks
view audit logs
manage security
manage billing if billing exists
delete organization
9. Administrator

Administrator has nearly complete operational access.

Can:

manage users
manage roles
manage permissions
manage CRM data
manage pipelines
manage custom fields
manage integrations
view audit logs
manage organization settings

Cannot:

transfer organization ownership unless explicitly granted
delete organization unless explicitly granted
10. Sales Manager

Sales managers manage their team's CRM activity.

Default scope:

TEAM

Can:

view team contacts
create contacts
edit team contacts
view team companies
manage team leads
manage team deals
manage team tasks
view team reports
create reports
export allowed data

Can generally access subordinate/team records but not unrelated teams unless granted.

11. Sales Representative

Default scope:

OWNED

Can:

create contacts
view contacts they are allowed to access
edit owned contacts
create leads
manage owned leads
create deals
manage owned deals
create tasks
manage own tasks
log activities
create notes

Cannot by default:

delete records
manage users
modify roles
configure integrations
access audit logs
modify organization settings
12. Support Agent

Default scope:

TEAM

Can:

view contacts
view companies
view deals
create/update activities
create/update tasks
create notes
access customer-related information

Normally cannot:

modify pipeline configuration
manage users
delete CRM records
manage integrations
13. Viewer

Read-only access.

Can:

contacts.read
companies.read
leads.read
deals.read
tasks.read
activities.read
reports.read

Cannot create, update or delete business data.

14. Permission Naming Convention

Permissions must follow:

resource.action

Examples:

contacts.read
contacts.create
contacts.update
contacts.delete
contacts.export

For administration:

users.read
users.create
users.update
users.delete

roles.read
roles.create
roles.update
roles.delete
15. Permission Catalogue
Contacts
contacts.read
contacts.create
contacts.update
contacts.delete
contacts.export
contacts.import
contacts.assign
contacts.merge
Companies
companies.read
companies.create
companies.update
companies.delete
companies.export
companies.import
companies.assign
companies.merge
Leads
leads.read
leads.create
leads.update
leads.delete
leads.export
leads.import
leads.assign
leads.convert
Deals
deals.read
deals.create
deals.update
deals.delete
deals.export
deals.assign
deals.move_stage
Tasks
tasks.read
tasks.create
tasks.update
tasks.delete
tasks.assign
tasks.complete
Activities
activities.read
activities.create
activities.update
activities.delete
Notes
notes.read
notes.create
notes.update
notes.delete
Files
files.read
files.upload
files.delete
files.download
Reports
reports.read
reports.create
reports.update
reports.delete
reports.export
Users
users.read
users.create
users.update
users.suspend
users.delete
users.invite
Roles
roles.read
roles.create
roles.update
roles.delete
roles.assign
Organization
organization.read
organization.update
organization.delete
Pipelines
pipelines.read
pipelines.create
pipelines.update
pipelines.delete
Custom Fields
custom_fields.read
custom_fields.create
custom_fields.update
custom_fields.delete
Tags
tags.read
tags.create
tags.update
tags.delete
Integrations
integrations.read
integrations.connect
integrations.update
integrations.disconnect
API
api_keys.read
api_keys.create
api_keys.revoke
webhooks.read
webhooks.create
webhooks.update
webhooks.delete
Security
security.read
security.update
sessions.read
sessions.revoke
audit_logs.read
16. Permission Scopes

A permission alone isn't enough.

Each permission has a scope.

Supported scopes:

NONE
OWN
TEAM
ORGANIZATION
GLOBAL
NONE

Action isn't permitted.

OWN

Only records owned by the user.

TEAM

Records belonging to the user's team.

ORGANIZATION

Any record within the organization.

GLOBAL

Platform-level permission.

17. Example

A Sales Representative:

deals.read = OWN
deals.update = OWN
deals.create = ORGANIZATION
deals.delete = NONE

Meaning:

They can create deals, but can only edit/view deals within their ownership scope.

A Sales Manager:

deals.read = TEAM
deals.update = TEAM
deals.create = ORGANIZATION
deals.delete = TEAM

An Administrator:

deals.read = ORGANIZATION
deals.update = ORGANIZATION
deals.create = ORGANIZATION
deals.delete = ORGANIZATION
18. Record Ownership

CRM entities should support ownership.

Example:

{
  "_id": "deal_123",
  "organizationId": "org_123",
  "ownerId": "user_123",
  "teamId": "team_sales",
  "createdBy": "user_123"
}

Ownership should exist on:

contacts
companies
leads
deals
tasks
reports

Activities and notes may inherit access from their parent record.

19. Team-Based Access

Teams allow managers to work with groups.

Example:

Sales Department
├── North Team
│   ├── Alex
│   └── Sarah
│
└── South Team
    ├── John
    └── Maria

If Alex has:

contacts.read = TEAM

Alex can see contacts belonging to:

North Team

but not:

South Team

unless explicitly granted.

20. Record-Level Sharing

For more advanced CRM deployments, records may optionally support explicit sharing.

Example:

Deal: Acme Enterprise Contract

Owner:
Alex Kumar

Shared with:
Maria Singh
John Doe

Access model:

Owner
Team
Explicit User
Organization

Explicit sharing should never grant more than the underlying permission permits.

For example:

User has deals.read
User does NOT have deals.update

Shared record
        ↓
Can READ
        ↓
Cannot UPDATE
21. Authorization Evaluation

Every API request should pass through this sequence:

Request
  ↓
Authentication
  ↓
Identify User
  ↓
Identify Organization
  ↓
Check Membership
  ↓
Load Role
  ↓
Check Permission
  ↓
Determine Scope
  ↓
Load Resource
  ↓
Check Organization
  ↓
Check Ownership/Team/Sharing
  ↓
ALLOW / DENY
22. Hono Middleware Architecture

Recommended structure:

middleware/
├── authenticate.ts
├── organization.ts
├── authorize.ts
├── scope.ts
├── rateLimit.ts
└── audit.ts

Example conceptual flow:

app.use(authenticate())

app.use(organizationContext())

app.delete(
  "/contacts/:id",
  authorize("contacts.delete"),
  checkRecordAccess("contact"),
  deleteContact
)

Authorization logic must live server-side.

23. Authorization Context

The backend should construct an authorization context:

interface AuthContext {
  userId: string;
  organizationId: string;
  roleId: string;
  permissions: Permission[];
  teamIds: string[];
}

For example:

{
  userId: "user_123",
  organizationId: "org_456",
  roleId: "sales_manager",
  permissions: [
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "deals.read",
    "deals.update"
  ],
  teamIds: [
    "team_north"
  ]
}
24. Authorization Result

Authorization should produce a simple decision:

type AuthorizationDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: AuthorizationReason;
    };

Reasons:

type AuthorizationReason =
  | "UNAUTHENTICATED"
  | "MEMBERSHIP_INACTIVE"
  | "PERMISSION_DENIED"
  | "ORGANIZATION_MISMATCH"
  | "OUTSIDE_SCOPE"
  | "RECORD_NOT_FOUND";

The API should generally avoid revealing sensitive distinctions to unauthorized users.

25. HTTP Responses

Unauthenticated:

401 Unauthorized

Authenticated but insufficient permission:

403 Forbidden

Resource doesn't exist or isn't accessible:

404 Not Found

This is important because returning:

403

for every inaccessible record can reveal that the record exists.

26. Frontend Authorization

The frontend may consume the user's permissions.

Example:

const can = usePermission();

can("contacts.create");
can("contacts.delete");

Usage:

{can("contacts.create") && (
  <Button>
    New Contact
  </Button>
)}

But this is UI behavior only.

The backend remains authoritative.

27. Permission-Aware Navigation

The sidebar should hide modules the user cannot access.

Example:

Dashboard
Contacts
Companies
Leads
Deals
Tasks
Calendar
Activities
Reports
────────────────
Settings

A Viewer who cannot access reports should not see:

Reports

However, directly visiting:

/app/reports

must still be rejected server-side.

28. Disabled vs Hidden Actions

Use:

Hidden

For functionality the user has no access to at all.

Example:

[Delete]

should generally not appear to a Viewer.

Disabled

For an action the user can conceptually understand but cannot currently perform because of state.

Example:

[Convert Lead]

could be disabled if the lead is already converted.

29. Bulk Actions

Bulk operations require permission checks against every selected record.

Example:

User selects:

Contact A — owned by user
Contact B — owned by user
Contact C — owned by another team

If their scope is OWN, the system must not simply execute:

deleteMany({
  _id: { $in: ids }
})

Instead, it must ensure every record is authorized.

Possible result:

2 contacts deleted.

1 contact could not be deleted because
you don't have permission.
30. MongoDB Security Requirement

Every query against organization-owned data must include:

organizationId

Example:

db.contacts.find({
  organizationId,
  _id: contactId
});

Not:

db.contacts.find({
  _id: contactId
});

This is one of the most important security rules in the entire CRM.

31. Organization ID Enforcement

Do not trust:

GET /api/contacts?organizationId=org_other

The organization should come from the authenticated membership context.

Bad:

const organizationId = c.req.query("organizationId");

Good:

const organizationId = c.get("auth").organizationId;
32. MongoDB Data Model

Recommended roles document:

interface Role {
  _id: ObjectId;
  organizationId: ObjectId;
  name: string;
  description?: string;
  system: boolean;

  permissions: {
    permission: string;
    scope: PermissionScope;
  }[];

  createdAt: Date;
  updatedAt: Date;
}
33. Membership Model
interface OrganizationMembership {
  _id: ObjectId;

  userId: ObjectId;
  organizationId: ObjectId;

  roleId: ObjectId;

  teamIds: ObjectId[];

  status:
    | "invited"
    | "active"
    | "suspended"
    | "removed";

  joinedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
34. Teams
interface Team {
  _id: ObjectId;

  organizationId: ObjectId;

  name: string;

  memberIds: ObjectId[];

  managerIds: ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}
35. Permission Definition

Permissions themselves can be system-defined:

interface PermissionDefinition {
  key: string;
  resource: string;
  action: string;
  description: string;
}

Example:

{
  "key": "deals.update",
  "resource": "deals",
  "action": "update",
  "description": "Update deals"
}

Do not allow ordinary organization administrators to arbitrarily invent permission keys.

36. System Roles vs Custom Roles

System roles:

system: true

Custom roles:

system: false

System roles should not be deletable.

Organizations can clone a system role:

Sales Representative
        ↓
Clone
        ↓
Enterprise Sales Representative

Then modify the clone.

37. Role Assignment

Only users with:

roles.assign

may assign roles.

Additional protection:

A user cannot assign a role with privileges greater than their own unless they have a dedicated administrative permission.

This prevents privilege escalation.

38. Privilege Escalation Prevention

Example:

Sales Manager

must not be able to assign:

Administrator

unless explicitly permitted.

The server should compare:

requesting user's effective permissions

against:

target role's permissions
39. Owner Protection

The organization owner cannot be:

deleted by another administrator
suspended accidentally
removed from the organization
assigned a lower role

Ownership transfer must be an explicit security-sensitive operation.

40. Audit Logging

All security-sensitive actions must generate audit records.

Examples:

USER_INVITED
USER_SUSPENDED
USER_REMOVED
ROLE_CREATED
ROLE_UPDATED
ROLE_DELETED
ROLE_ASSIGNED
PERMISSION_CHANGED
API_KEY_CREATED
API_KEY_REVOKED
WEBHOOK_CREATED
WEBHOOK_DELETED
INTEGRATION_CONNECTED
INTEGRATION_DISCONNECTED
SESSION_REVOKED
ORGANIZATION_UPDATED
41. Audit Record
interface AuditLog {
  _id: ObjectId;

  organizationId: ObjectId;

  actorUserId: ObjectId;

  action: string;

  resourceType: string;

  resourceId?: ObjectId;

  metadata?: Record<string, unknown>;

  ipAddress?: string;

  userAgent?: string;

  createdAt: Date;
}

Never store passwords, tokens, API secrets or other sensitive credentials in audit metadata.

42. Sensitive Operations

The following should require additional protection:

Change password
Enable/disable MFA
Transfer ownership
Delete organization
Create API key
Revoke API key
Change administrator permissions
Disconnect integration
Export sensitive data

Depending on deployment requirements, these may require:

password re-authentication
+
MFA
43. Data Export Permissions

Exports should be treated as a privileged operation.

For example:

contacts.export
companies.export
leads.export
deals.export
reports.export

A user having:

contacts.read

does not automatically mean they have:

contacts.export
44. Import Permissions

Likewise:

contacts.import
companies.import
leads.import

must be separately controlled.

Imports should also respect ownership and team rules.

45. API Key Permissions

API keys should have their own restricted permission set.

Example:

API Key: Reporting

contacts.read
companies.read
deals.read
reports.read

The API key cannot inherit the user's entire permission set dynamically unless explicitly designed that way.

Recommended behavior:

Effective API permissions
=
User permissions
∩
API key permissions
46. Webhook Security

Webhook configuration requires:

webhooks.create
webhooks.update
webhooks.delete

Webhook secrets must:

never be displayed after creation
be stored encrypted/hashed where appropriate
never appear in logs
never appear in API responses after initial creation
47. Audit Log Visibility

Recommended:

Owner              ORGANIZATION
Administrator      ORGANIZATION
Sales Manager      TEAM / relevant operational logs
Sales Rep          NONE
Viewer             NONE

Organizations may configure this further.

48. Permission Matrix

Baseline configuration:

Resource	Owner	Admin	Manager	Sales	Support	Viewer
Contacts	Full	Full	Team	Own	Team	Read
Companies	Full	Full	Team	Own	Team	Read
Leads	Full	Full	Team	Own	Team	Read
Deals	Full	Full	Team	Own	Team	Read
Tasks	Full	Full	Team	Own	Team	Read
Activities	Full	Full	Team	Own	Team	Read
Notes	Full	Full	Team	Own	Team	Read
Files	Full	Full	Team	Own	Team	Read
Reports	Full	Full	Team	Own	Team	Read
Users	Full	Full	Read	None	None	None
Roles	Full	Full	None	None	None	None
Pipelines	Full	Full	Read	Read	Read	Read
Custom Fields	Full	Full	Read	Read	Read	Read
Integrations	Full	Full	None	None	None	None
API Keys	Full	Full	None	None	None	None
Webhooks	Full	Full	None	None	None	None
Audit Logs	Full	Full	Limited	None	None	None
Organization	Full	Full	Read	None	None	None

Full means the role's actual permissions and scopes should be configured explicitly rather than implementing a magic "full access" bypass everywhere.

49. Permission Evaluation Example

Request:

PATCH /api/deals/64f...

User:

Alex
Role: Sales Representative
Permission:
deals.update = OWN

Deal:

organizationId = org_123
ownerId = maria_456

Result:

Authenticated       ✓
Organization        ✓
Permission          ✓
Ownership           ✗

→ 403 Forbidden

If the deal belongs to another organization:

Organization        ✗

→ 404 Not Found
50. Frontend Permission Context

React should expose:

interface PermissionContext {
  permissions: PermissionAssignment[];

  can(
    permission: string,
    resource?: ResourceContext
  ): boolean;

  scope(
    permission: string
  ): PermissionScope | null;
}

Example:

const { can } = useAuthorization();

if (can("deals.create")) {
  // show create button
}

For a record:

can("deals.update", {
  ownerId: deal.ownerId,
  teamId: deal.teamId,
})

Again, this is only for UX.

51. Backend Authorization API

Recommended helper:

authorize({
  permission: "deals.update",
  resource: deal,
});

Or:

await authorization.assert({
  user,
  organizationId,
  permission: "deals.update",
  resource: deal,
});

If unauthorized:

throw new ForbiddenError();
52. Middleware Structure

Recommended Hono flow:

Request
 │
 ▼
requestId
 │
 ▼
rateLimit
 │
 ▼
authenticate
 │
 ▼
organizationContext
 │
 ▼
route handler
 │
 ├── authorize
 │
 ├── load resource
 │
 └── authorize resource scope
 │
 ▼
service
 │
 ▼
MongoDB
 │
 ▼
audit
53. Authorization Must Be Tested

RBAC requires automated tests.

Minimum test categories:

Authentication
Organization isolation
Role permissions
Permission scopes
Ownership
Team access
Explicit sharing
Admin access
Viewer restrictions
Bulk operations
API keys
Audit logs
Privilege escalation
54. Required Security Tests
Cross-organization access
User A → Org A
User B → Org B

User A attempts:
GET /contacts/:orgBContact

Expected:
404
Unauthorized update
Sales Rep
deals.update = OWN

Attempt to update another user's deal.

Expected:
403
Unauthorized delete
Sales Rep
deals.delete = NONE

Attempt DELETE.

Expected:
403
Role escalation
Sales Manager
attempts assigning Administrator role.

Expected:
403
Suspended user
User status = suspended

Attempt API request.

Expected:
401/403
55. Performance Requirements

Authorization should not require excessive database queries.

Avoid:

Request
 → load user
 → load membership
 → load role
 → load permissions
 → load team
 → load record

for every request when possible.

Cache relatively static authorization data:

user membership
role
permissions
team membership

Invalidate the cache when:

role changes
permissions change
membership changes
user suspended
user removed

Record-level checks must still happen against current data.

56. Security Logging

Never log:

password
session token
JWT
API key
API secret
OAuth refresh token
MFA secret

Safe audit information:

userId
organizationId
action
resourceId
timestamp
IP
user agent
57. RBAC Acceptance Criteria

The RBAC implementation is complete when:

□ Every protected API route requires authentication
□ Every organization-owned query is organization scoped
□ Permissions are checked server-side
□ Resource scope is checked server-side
□ Users cannot modify their own authorization level
□ Users cannot grant permissions they don't possess
□ Organization owner is protected
□ Suspended users cannot access the organization
□ Bulk actions enforce record-level authorization
□ API keys have restricted permissions
□ Sensitive actions are audited
□ Audit logs cannot be modified by normal users
□ Frontend hides unauthorized actions
□ Direct URL access is protected
□ Cross-organization access tests pass
□ Privilege escalation tests pass
□ RBAC integration tests exist
58. Recommended Final Authorization Architecture
                       ┌───────────────┐
                       │   Request     │
                       └───────┬───────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │ Authentication   │
                     └────────┬─────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Organization       │
                    │ Membership         │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Role + Permissions │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Action Permission  │
                    │ contacts.update    │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Scope Evaluation   │
                    │ OWN / TEAM / ORG   │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Record Ownership   │
                    │ / Team / Sharing   │
                    └─────────┬──────────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
                   ALLOW              DENY
                     │
                     ▼
                  Service
                     │
                     ▼
                  MongoDB
                     │
                     ▼
                Audit Event
The important implementation decision

I strongly recommend not implementing this as:

if (user.role === "admin") ...
else if (user.role === "sales") ...

That works for a prototype and becomes a mess surprisingly quickly.

Implement:

Role
  ↓
Permission
  ↓
Scope
  ↓
Resource authorization

from the beginning. Then your CRM can support custom roles, teams, enterprise customers, restricted departments, API users, and future modules without rewriting authorization later.
