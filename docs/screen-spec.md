Screen-by-Screen UI Specification
Industry-Ready CRM

Version: 1.0
Platform: Web Application
Frontend: React + TypeScript + Tailwind CSS
Design: Minimal Enterprise / Government Portal
Primary viewport: 1280px+
Accessibility: WCAG 2.1 AA

1. Screen Inventory

The application should contain the following screens.

PUBLIC
├── Login
├── Forgot Password
├── Reset Password
└── Invitation Acceptance

ONBOARDING
├── Welcome
├── Organization Setup
├── Team Setup
├── Pipeline Setup
├── Import Data
└── Onboarding Complete

APPLICATION
├── Dashboard
│
├── Contacts
│   ├── Contact List
│   ├── Contact Create
│   ├── Contact Detail
│   └── Contact Edit
│
├── Companies
│   ├── Company List
│   ├── Company Create
│   ├── Company Detail
│   └── Company Edit
│
├── Leads
│   ├── Lead List
│   ├── Lead Kanban
│   ├── Lead Create
│   ├── Lead Detail
│   └── Lead Edit
│
├── Deals
│   ├── Deal Pipeline
│   ├── Deal List
│   ├── Deal Create
│   ├── Deal Detail
│   └── Deal Edit
│
├── Tasks
│   ├── Task List
│   ├── Task Create
│   └── Task Detail
│
├── Calendar
│   ├── Month
│   ├── Week
│   ├── Day
│   └── Agenda
│
├── Activities
│   ├── Activity Feed
│   └── Activity Detail
│
├── Reports
│   ├── Report List
│   ├── Report Builder
│   └── Report View
│
└── Settings
    ├── Profile
    ├── Organization
    ├── Team
    ├── Roles & Permissions
    ├── Pipelines
    ├── Custom Fields
    ├── Tags
    ├── Notifications
    ├── Integrations
    ├── API Keys
    ├── Webhooks
    ├── Security
    ├── Sessions
    └── Audit Log
2. Global Application Shell

Every authenticated screen uses the same shell.

┌────────────────────────────────────────────────────────────────────┐
│ CRM │ Search contacts, companies, deals...       🔔  ?  Alex Kumar │
├────────────────┬───────────────────────────────────────────────────┤
│                │                                                   │
│ Dashboard      │                                                   │
│ Contacts       │                                                   │
│ Companies      │                                                   │
│ Leads          │                 SCREEN CONTENT                    │
│ Deals          │                                                   │
│                │                                                   │
│ Tasks          │                                                   │
│ Calendar       │                                                   │
│ Activities     │                                                   │
│                │                                                   │
│ Reports        │                                                   │
│                │                                                   │
│ Settings       │                                                   │
│                │                                                   │
└────────────────┴───────────────────────────────────────────────────┘
Global header

Components:

organization/logo
global search
notification button
help button
user menu
User menu
Alex Kumar
alex@example.com
────────────────
Profile
Preferences
────────────────
Sign out
3. LOGIN

Route

/login
Purpose

Authenticate a user.

Layout

Centered card.

┌───────────────────────────────┐
│                               │
│             CRM               │
│                               │
│ Sign in                       │
│                               │
│ Email                         │
│ [_________________________]   │
│                               │
│ Password                      │
│ [_________________________]   │
│                               │
│ [        Sign In           ]  │
│                               │
│ Forgot password?              │
│                               │
└───────────────────────────────┘
Components
Logo
Email input
Password input
Show password button
Sign-in button
Forgot password link
States

Loading:

[ Signing in... ]

Invalid credentials:

Invalid email or password.

Account suspended:

Your account has been suspended.
Contact your administrator.
4. FORGOT PASSWORD

Route

/forgot-password
UI
Forgot password?

Enter your email address and we'll send
instructions to reset your password.

Email
[________________________]

[Send Reset Link]

← Back to sign in
Success
If an account exists for this email,
you will receive reset instructions.

Do not reveal whether an email exists.

5. RESET PASSWORD

Route

/reset-password?token=...

Fields:

New password
[________________]

Confirm password
[________________]

[Reset Password]

Password requirements should be displayed before submission.

6. INVITATION ACCEPTANCE

Route

/invite/:token

Display:

You've been invited to join

Acme Corporation

Set up your account.

First name
[____________]

Last name
[____________]

Password
[____________]

[Accept Invitation]

Email should be displayed as read-only.

7. ONBOARDING — WELCOME

Route

/onboarding
Welcome to CRM

Let's get your workspace ready.

This will take a few minutes.

[Get Started]

Progress indicator:

●───○───○───○───○
8. ORGANIZATION SETUP
Organization Setup

Organization name
[________________]

Industry
[ Select ]

Country
[ Select ]

Timezone
[ Select ]

Currency
[ Select ]

[Back] [Continue]
9. TEAM SETUP
Invite your team

Email addresses

[ alex@example.com       ]
[ maria@example.com      ]
[ john@example.com       ]

+ Add another

Role
[ Sales Representative ▼ ]

[Back] [Continue]

Allow skipping.

10. PIPELINE SETUP
Set up your sales pipeline

Pipeline name
[ Sales Pipeline ]

Stages

1  New
2  Qualified
3  Proposal
4  Negotiation
5  Closed Won
6  Closed Lost

[+ Add Stage]

[Back] [Continue]

Stages should be reorderable.

11. IMPORT DATA
Bring in your existing data

Import contacts from CSV.

[ Upload CSV ]

or

[Skip for now]
12. ONBOARDING COMPLETE
Your workspace is ready.

You've successfully configured CRM.

[Go to Dashboard]
13. DASHBOARD

Route

/app/dashboard
Header
Dashboard

Overview of your sales activity.

[Date Range ▼]
KPI row
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Open Deals  │ │ Pipeline    │ │ Won Revenue │ │ New Leads   │
│ 42          │ │ ₹2.4 Cr     │ │ ₹48 L       │ │ 128         │
│ +12%        │ │ +8%         │ │ +14%        │ │ +21%        │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
Main sections
Sales Pipeline
Recent Activity
Upcoming Tasks
Deals Closing Soon
Lead Conversion
Dashboard empty state

If there is no data:

Welcome to your CRM

Add contacts or create your first deal
to start seeing business insights.

[Create Contact]
[Create Deal]
14. CONTACT LIST

Route

/app/contacts
Header
Contacts

Manage contacts and customer relationships.

[Import] [Export] [+ New Contact]
Toolbar
[ Search contacts... ]

[Filters] [Views] [Columns] [More]
Table
☐  Name          Company       Email          Phone       Owner   Status
────────────────────────────────────────────────────────────────────────
☐  John Smith    Acme Ltd      john@...      +91...      Alex    Active
☐  Sarah Jones   Globex        sarah@...      +91...      Maria   Lead
☐  David Brown   Initech       david@...      +91...      Alex    Active
Pagination
Rows per page: 25

1–25 of 248

‹ 1 2 3 4 5 ›
15. CONTACT FILTER DRAWER

Opened using:

[Filters]

Drawer:

FILTER CONTACTS

Status
[ All ▼ ]

Owner
[ All ▼ ]

Company
[ Select company ]

Tags
[ Select tags ]

Created
[ Date range ]

Lifecycle Stage
[ Select ]

────────────────

[Clear]             [Apply Filters]

Active filters appear above the table.

16. CONTACT CREATE

Route

/app/contacts/new
Header
New Contact

[Cancel] [Save Contact]
Form
CONTACT INFORMATION

First name                 Last name
[______________]           [______________]

Email                      Phone
[______________]           [______________]

Mobile                     Job title
[______________]           [______________]

Company
[ Select company ]

Owner
[ Select owner ]

Lifecycle stage
[ Select ]

Tags
[ Select tags ]
Additional information

Collapsed by default:

Additional Information
[Show]

Contains custom fields.

17. CONTACT DETAIL

Route

/app/contacts/:id
Header
Contacts / John Smith

John Smith
Senior Manager
Acme Corporation

[Edit] [Log Activity] [Create Task] [More]
Tabs
Overview
Activity
Deals
Tasks
Notes
Files
Overview
CONTACT INFORMATION

Email
john@example.com

Phone
+91 XXXXX XXXXX

Company
Acme Corporation

Job Title
Senior Manager

Owner
Alex Kumar

Status
Active
Related information
Open Deals
Tasks
Recent Activity
18. CONTACT EDIT

Same layout as create.

Header:

Edit Contact

[Cancel] [Save Changes]

When changes are made:

Unsaved changes

Leaving the page triggers confirmation.

19. COMPANY LIST

Route

/app/companies
Table
☐ Company       Industry      Contacts    Open Deals    Owner
────────────────────────────────────────────────────────────
☐ Acme Ltd      Technology    24          5             Alex
☐ Globex        Finance       12          2             Maria

Actions:

[Import] [Export] [+ New Company]
20. COMPANY CREATE

Route

/app/companies/new

Fields:

Company name *
Website
Industry
Phone
Email

Address
Street
City
State
Postal Code
Country

Owner
Tags

Custom Fields
21. COMPANY DETAIL

Route

/app/companies/:id

Header:

Acme Corporation

Technology · Enterprise

[Edit] [More]

Metrics:

Contacts      Open Deals      Pipeline Value
24            5               ₹42,00,000

Tabs:

Overview
Contacts
Deals
Activities
Notes
Files
22. LEAD LIST

Route

/app/leads

Toolbar:

[Search leads...] [Filters] [Views] [+ New Lead]

Table:

Lead          Company       Source      Status       Score     Owner
────────────────────────────────────────────────────────────────────
John Smith    Acme          Website     New          72        Alex
Sarah Jones   Globex        Referral    Qualified    91        Maria

View switcher:

[Table] [Kanban]
23. LEAD KANBAN

Route

/app/leads?view=kanban
NEW
────────────────
John Smith
Acme
Score: 72

Sarah Jones
Globex
Score: 65


CONTACTED
────────────────
David Brown
Initech
Score: 81


QUALIFIED
────────────────
Jane Doe
Umbrella
Score: 94

Dragging between columns changes status.

24. LEAD CREATE

Fields:

Lead Information

First Name
Last Name

Email
Phone

Company
Company Name

Source
[Website ▼]

Status
[New ▼]

Lead Score

Owner

Tags
25. LEAD DETAIL

Header:

John Smith

Acme Corporation

Status: Qualified
Score: 91

[Edit] [Convert] [Create Task] [More]

Sections:

Lead Information
Contact Information
Company
Activity
Notes
Tasks
26. LEAD CONVERSION

Click:

[Convert]

Modal:

Convert Lead

Create:

☑ Contact
☑ Company
☑ Deal

Deal name
[________________]

Pipeline
[Sales Pipeline]

Stage
[Qualified]

[Cancel] [Convert Lead]

After conversion:

Lead successfully converted.

[View Contact]
[View Company]
[View Deal]
27. DEAL PIPELINE

Route

/app/deals

Header:

Deals

Sales pipeline and opportunities.

[Pipeline: Sales Pipeline ▼]

[Table] [Pipeline]

[+ New Deal]

Kanban:

┌─────────────┬─────────────┬─────────────┬─────────────┐
│ NEW         │ QUALIFIED   │ PROPOSAL    │ NEGOTIATION │
│ 8 deals     │ 6 deals     │ 4 deals     │ 3 deals     │
│ ₹24L        │ ₹42L        │ ₹65L        │ ₹82L        │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Deal A      │ Deal D      │ Deal G      │ Deal K      │
│ ₹5L         │ ₹8L         │ ₹15L        │ ₹20L        │
│             │             │             │             │
│ Deal B      │ Deal E      │ Deal H      │ Deal L      │
│ ₹3L         │ ₹12L        │ ₹7L         │ ₹8L         │
└─────────────┴─────────────┴─────────────┴─────────────┘
28. DEAL LIST

Table:

Deal
Company
Stage
Value
Probability
Expected Close
Owner
Last Activity

Filters:

Pipeline
Stage
Owner
Value
Expected Close
Tags
29. DEAL CREATE

Fields:

Deal Information

Deal name *
[________________]

Company *
[Select company]

Primary contact
[Select contact]

Pipeline
[Sales Pipeline]

Stage
[New]

Value
[₹ __________]

Probability
[___ %]

Expected close
[Date]

Owner
[Select]

Priority
[Select]

Tags
30. DEAL DETAIL

Header:

Acme Enterprise Contract

₹12,00,000

Proposal

Expected close: 24 Aug 2026
Owner: Alex Kumar

[Edit] [Move Stage] [Create Task] [More]

Tabs:

Overview
Activity
Contacts
Tasks
Notes
Files
Timeline

Overview:

DEAL INFORMATION

Value             ₹12,00,000
Probability       70%
Expected Close   24 Aug 2026
Pipeline          Sales Pipeline
Stage             Proposal
Owner             Alex Kumar
31. MOVE DEAL STAGE

Click:

[Move Stage]

Modal:

Move Deal

Current stage
Proposal

New stage
[Negotiation ▼]

[Cancel] [Move Deal]

The system should create an activity:

Deal moved from Proposal to Negotiation
32. TASK LIST

Route

/app/tasks

Header:

Tasks

Manage your work.

[Filters] [+ New Task]

Views:

[My Tasks] [All Tasks] [Completed]

List:

☐ Follow up with Acme
  Today · High · Alex

☐ Send proposal to Globex
  Tomorrow · Medium · Maria

☑ Call John
  Completed · Alex
33. CREATE TASK

Fields:

Task title *
[________________]

Description

Assigned to
[Select user]

Due date
[Date]

Priority
[Low / Medium / High / Urgent]

Related to
[Contact / Company / Deal]

Status
[To Do]
34. TASK DETAIL

Drawer or page:

Follow up with Acme

Status: In Progress
Priority: High

Assigned to
Alex Kumar

Due
07 Aug 2026

Related deal
Acme Enterprise Contract

Description
...

Actions:

[Complete]
[Edit]
[Delete]
35. CALENDAR

Route

/app/calendar

Header:

Calendar

[Today] [‹] [›]

August 2026

[Month] [Week] [Day] [Agenda]

Events use the same underlying activity/task system.

36. CALENDAR EVENT

Clicking an event opens:

Client Meeting

10:00 AM – 11:00 AM

Acme Corporation
John Smith

Owner
Alex Kumar

[Open Record]
[Edit]
37. ACTIVITY FEED

Route

/app/activities

Header:

Activity

All activity across your CRM.

[Filters]

Timeline:

TODAY

10:42 AM
Alex Kumar updated John Smith
Status: Lead → Customer

10:15 AM
Maria Singh created a deal
Acme Enterprise Contract

09:40 AM
Alex Kumar completed a task
Follow up with Acme

Filters:

Activity type
User
Date
Entity
38. ACTIVITY COMPOSER

Available from records and global actions.

Log Activity

Type

[Call] [Email] [Meeting] [Note]

Subject
[________________]

Date
[________]

Description
[____________________________]
[____________________________]

Related record
[John Smith]

[Cancel] [Save Activity]
39. NOTES

Notes should be available inside records.

Notes

[+ Add Note]

────────────────────────────

Follow-up discussion

Alex Kumar
07 Aug 2026

Customer requested revised pricing...

Note editor:

Title
[________________]

Content
[Rich text editor]

[Cancel] [Save]
40. FILES

Inside a record:

Files

[Upload]

Name                 Size       Uploaded
──────────────────────────────────────────
proposal.pdf         2.4 MB     Alex
contract.docx        812 KB     Maria

Actions:

Preview
Download
Delete

Permissions must apply.

41. REPORT LIST

Route

/app/reports
Reports

[+ Create Report]

My Reports
────────────────────────────

Sales Performance
Pipeline Overview
Lead Conversion
Activity Report

Each report displays:

Name
Type
Owner
Last Updated
42. REPORT BUILDER
Create Report

Data source
[Deals ▼]

Metrics
☑ Deal Count
☑ Revenue
☐ Average Deal Size

Group by
[Owner ▼]

Filters

Stage
[All]

Date
[This Month]

Visualization
○ Table
○ Bar Chart
○ Line Chart

[Preview]

[Save Report]
43. REPORT VIEW
Sales Performance

01 Aug – 07 Aug 2026

[Edit] [Export]

┌─────────────────────────────────────────┐
│ Revenue by Sales Representative         │
│                                         │
│ Alex      ₹24L                          │
│ Maria     ₹18L                          │
│ John      ₹12L                          │
└─────────────────────────────────────────┘

Data

Sales Rep       Deals       Revenue
Alex             12         ₹24L
Maria             9         ₹18L
John              6         ₹12L
44. SETTINGS — PROFILE

Route

/app/settings/profile
Profile

Personal Information

First name
Last name
Email
Phone
Timezone
Language

[Save Changes]

Avatar:

[Upload Photo]
[Remove]
45. SETTINGS — ORGANIZATION
Organization

Organization name
Industry
Website
Country
Timezone
Currency

Logo
[Upload]

[Save Changes]

Only admins/owners can modify this.

46. SETTINGS — TEAM

Route

/app/settings/team
Team

[Invite User]

Name            Email             Role       Status
──────────────────────────────────────────────────────
Alex Kumar      alex@...          Admin      Active
Maria Singh     maria@...          Sales      Active
John Doe        john@...           Viewer     Invited

Actions:

Edit
Suspend
Resend Invite
Remove
47. INVITE USER

Modal:

Invite Team Member

Email
[________________]

Role
[Sales Representative ▼]

[Cancel] [Send Invitation]
48. SETTINGS — ROLES
Roles & Permissions

[+ Create Role]

Role                Users
────────────────────────────
Owner               1
Administrator       2
Sales Representative 8
Support             4
Viewer              3
49. ROLE EDITOR
Sales Representative

CONTACTS
☑ Read
☑ Create
☑ Update
☐ Delete
☑ Export

COMPANIES
☑ Read
☑ Create
☑ Update
☐ Delete

DEALS
☑ Read
☑ Create
☑ Update
☐ Delete

REPORTS
☑ Read
☐ Create

Permissions should be grouped by module.

50. SETTINGS — PIPELINES
Pipelines

[+ New Pipeline]

Sales Pipeline
Active
6 stages

──────────────────────

[Edit]

Pipeline editor:

Sales Pipeline

Stages

☰ New
☰ Qualified
☰ Proposal
☰ Negotiation
☰ Closed Won
☰ Closed Lost

[+ Add Stage]

[Save]

Drag-and-drop reordering.

51. PIPELINE STAGE EDITOR
Stage

Name
[Negotiation]

Probability
[70%]

Color
[●]

Closed stage
☐

[Cancel] [Save]
52. SETTINGS — CUSTOM FIELDS
Custom Fields

Entity
[Contacts ▼]

[+ Add Field]

Field             Type          Required
──────────────────────────────────────────
Customer ID       Text          Yes
Industry          Select        No
Renewal Date      Date          No
Annual Revenue    Currency      No
53. CUSTOM FIELD CREATION
Create Custom Field

Entity
[Contact]

Field label
[________________]

Field type
[Text ▼]

Required
☐

Description
[________________]

[Cancel] [Create Field]

For select fields:

Options

Enterprise
SMB
Startup
Government

[+ Add Option]
54. SETTINGS — TAGS
Tags

[+ Create Tag]

Name            Used
──────────────────────
Enterprise      128
VIP             54
Partner         23
Renewal         18

Create:

Tag name
[____________]

[Cancel] [Create]
55. SETTINGS — NOTIFICATIONS
Notification Preferences

Email Notifications

Task assigned
☑

Task due
☑

Deal assigned
☑

Deal stage changed
☑

Mentions
☑

In-app Notifications

Task assigned
☑

Deal updates
☑

System alerts
☑

[Save Preferences]
56. SETTINGS — INTEGRATIONS
Integrations

Connected
────────────────────────

Google Calendar
Connected
[Configure]

Email
Connected
[Configure]

Available
────────────────────────

Google Calendar
[Connect]

Slack
[Connect]

Microsoft 365
[Connect]
57. INTEGRATION DETAIL
Google Calendar

Status
● Connected

Connected account
alex@example.com

Calendar
Primary Calendar

Sync
Two-way

Last synchronization
07 Aug 2026, 10:32

[Sync Now]
[Disconnect]
58. SETTINGS — API KEYS
API Keys

[+ Create API Key]

Name             Created       Last Used
──────────────────────────────────────────
Production       01 Aug        Today
Reporting        12 Jul        Yesterday

Creating:

Create API Key

Name
[________________]

Permissions

☑ Read Contacts
☑ Read Companies
☐ Write Contacts
☐ Write Deals

[Create Key]

The generated secret should only be shown once.

59. SETTINGS — WEBHOOKS
Webhooks

[+ Create Webhook]

Endpoint
https://example.com/webhook

Events
contact.created
deal.updated

Status
Active

Webhook editor:

Endpoint URL
[____________________________]

Events

☑ contact.created
☑ contact.updated
☑ deal.created
☑ deal.updated
☐ task.completed

Status
[Active]

[Save Webhook]
60. SETTINGS — SECURITY
Security

Password
Last changed: 24 days ago
[Change Password]

Two-factor authentication
Not enabled
[Enable]

Active sessions
3
[Manage Sessions]
61. TWO-FACTOR SETUP
Enable Two-Factor Authentication

1. Scan QR code
2. Enter verification code

[ QR CODE ]

Verification code
[______]

[Verify & Enable]

Backup codes should be displayed after successful setup.

62. SETTINGS — SESSIONS
Active Sessions

Current Session
Chrome · Windows
Patiala, India
Active now

Safari
macOS
Last active 2 hours ago

Firefox
Linux
Last active yesterday

[Sign Out Other Sessions]
63. SETTINGS — AUDIT LOG
Audit Log

[Search] [Filters] [Export]

Timestamp       User       Action              Entity
────────────────────────────────────────────────────────
10:42            Alex      Updated             Contact
10:38            Maria     Created             Deal
09:15            Alex      Assigned            Task

Filters:

User
Action
Entity
Date
IP address
64. GLOBAL SEARCH SCREEN

Triggered from:

Ctrl/Cmd + K
Search CRM

[ Acme                         ]

CONTACTS
John Smith
Sarah Jones

COMPANIES
Acme Corporation

DEALS
Acme Enterprise Contract

TASKS
Follow up with Acme

──────────────────────────
View all results →
65. COMMAND PALETTE
Commands

Create
────────────────
Create Contact
Create Company
Create Lead
Create Deal
Create Task

Navigate
────────────────
Dashboard
Contacts
Companies
Leads
Deals
Tasks
Calendar
Reports
Settings
66. NOTIFICATION PANEL
Notifications

Mark all as read

TODAY

● Alex assigned you a task
  5 minutes ago

● Deal moved to Negotiation
  32 minutes ago

● Import completed
  1 hour ago

YESTERDAY

● New team member joined

Clicking a notification should navigate to the relevant record.

67. HELP PANEL
Help

Search help articles

[________________]

Quick links

Getting Started
Managing Contacts
Managing Deals
Importing Data
Reports

────────────────

Contact Support
System Status
68. GLOBAL CREATE MENU

The global + action should provide:

Create

Contact
Company
Lead
Deal
Task
Activity

This menu should be available from the header.

69. GLOBAL ERROR MODAL

For unexpected errors:

Something went wrong

We couldn't complete this action.

Reference ID
ERR-84A29C

[Try Again] [Close]

Never expose raw stack traces to users.

70. DELETE CONFIRMATION

Every destructive entity deletion uses:

Delete Contact?

John Smith will be removed.

This action may affect related records.

Type DELETE to confirm.

[________________]

[Cancel] [Delete Contact]

For particularly destructive operations, require explicit text confirmation.

71. SESSION EXPIRATION

When authentication expires:

Your session has expired.

Please sign in again to continue.

[Sign In]

If possible, preserve the current route and return the user there after authentication.

72. RESPONSIVE SCREEN RULES

At <1024px:

sidebar collapses
tables become horizontally scrollable
secondary actions move into More
two-column forms may become single-column

At <768px:

sidebar becomes drawer
page padding becomes 16px
tables convert to cards where appropriate
header search becomes icon/button
multi-column dashboards become one column
73. Mobile Contact Card

Instead of:

Name | Company | Email | Owner | Status

show:

John Smith
Acme Corporation

john@example.com
+91 XXXXX XXXXX

Active · Alex Kumar

[View]
74. Mobile Deal Card
Acme Enterprise Contract

Acme Corporation

₹12,00,000
Proposal

Expected close
24 Aug 2026

Alex Kumar

[Open]
75. Mobile Navigation

Bottom navigation should not attempt to fit the entire CRM.

Use:

┌─────────────────────────────────────┐
│ Home   Contacts   Deals   Tasks  ☰ │
└─────────────────────────────────────┘

The remaining modules live inside the menu.

76. Page-Level State Matrix

Every major screen must implement these states:

State	Required
Initial loading	Yes
Loaded	Yes
Empty	Yes
Search empty	Yes
Filter empty	Yes
API error	Yes
Permission denied	Yes
Network error	Yes
Mutation loading	Yes
Mutation success	Yes
Mutation error	Yes
77. Table State Example
Loading
████████████████████
██████████████
████████████████████
Empty
No contacts yet

[Create Contact]
Search empty
No contacts match "johnxyz".

[Clear Search]
Error
Unable to load contacts.

[Try Again]
Permission
You don't have permission
to view contacts.

[Go Back]
78. Form State Matrix

Every form needs:

Initial
Editing
Validation Error
Submitting
Success
Server Error
Unsaved Changes

Example:

Normal:
[Save Contact]

Submitting:
[Saving...]

Success:
✓ Contact created

Server error:
Unable to create contact.
Please try again.
79. Interaction Rules
Clicking a table row

Opens the record.

Clicking an action icon

Does not open the record unless explicitly designed to.

Right-click

No required functionality.

Double click

No required functionality.

Enter

Submit focused form when appropriate.

Escape

Close:

modal
drawer
dropdown
command palette
80. Drag and Drop

Drag-and-drop is allowed only where it has clear meaning:

deal stage
lead status
pipeline stage order
dashboard widget ordering
custom field ordering

Never make ordinary navigation dependent on drag-and-drop.

81. Confirmation Policy

Do not confirm harmless actions.

Don't do:

Are you sure you want to save?

Do confirm:

Delete
Bulk delete
Disconnect integration
Revoke API key
Remove team member
Discard unsaved changes
82. Data Formatting
Currency

Use organization currency.

Example:

₹12,00,000
Dates

Display according to organization/user locale.

Example:

07 Aug 2026
Date/time
07 Aug 2026, 10:42 AM
Large numbers
1,248
₹2.4 Cr

The underlying data must remain precise; abbreviated values are presentation-only.

83. Permission UX Matrix
Action	Viewer	Sales	Manager	Admin
View contacts	✓	✓	✓	✓
Create contact		✓	✓	✓
Edit contact		✓	✓	✓
Delete contact			✓	✓
Export contacts		✓	✓	✓
Manage users				✓
Manage roles				✓
Manage integrations				✓
View audit log			✓	✓

The actual permission system should remain configurable rather than hard-coding these roles.

84. Final Route Map
/login
/forgot-password
/reset-password
/invite/:token

/onboarding
/onboarding/organization
/onboarding/team
/onboarding/pipeline
/onboarding/import
/onboarding/complete

/app/dashboard

/app/contacts
/app/contacts/new
/app/contacts/:id
/app/contacts/:id/edit

/app/companies
/app/companies/new
/app/companies/:id
/app/companies/:id/edit

/app/leads
/app/leads/new
/app/leads/:id
/app/leads/:id/edit

/app/deals
/app/deals/new
/app/deals/:id
/app/deals/:id/edit

/app/tasks
/app/tasks/new
/app/tasks/:id

/app/calendar
/app/activities

/app/reports
/app/reports/new
/app/reports/:id

/app/settings/profile
/app/settings/organization
/app/settings/team
/app/settings/roles
/app/settings/pipelines
/app/settings/custom-fields
/app/settings/tags
/app/settings/notifications
/app/settings/integrations
/app/settings/api-keys
/app/settings/webhooks
/app/settings/security
/app/settings/sessions
/app/settings/audit-log
85. React Implementation Mapping

The screen specification should translate roughly into this structure:

src/
│
├── app/
│   ├── router.tsx
│   ├── App.tsx
│   └── providers/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   └── feedback/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── contacts/
│   ├── companies/
│   ├── leads/
│   ├── deals/
│   ├── tasks/
│   ├── calendar/
│   ├── activities/
│   ├── reports/
│   └── settings/
│
├── hooks/
├── lib/
├── stores/
├── types/
└── styles/
86. Screen Implementation Checklist

Before calling a screen complete:

SCREEN
□ Correct route
□ Correct page title
□ Breadcrumb
□ Primary action
□ Secondary actions
□ Permission handling

DATA
□ Loading state
□ Empty state
□ Error state
□ Pagination
□ Search
□ Filters
□ Sorting

FORMS
□ Validation
□ Required fields
□ Submit loading
□ Success feedback
□ Server errors
□ Unsaved changes

INTERACTION
□ Keyboard support
□ Modal behavior
□ Drawer behavior
□ Confirmation dialogs
□ Toast feedback

RESPONSIVE
□ Desktop
□ Tablet
□ Mobile

ACCESSIBILITY
□ Labels
□ Focus states
□ Keyboard navigation
□ ARIA where necessary
□ Contrast

SECURITY
□ Permission-aware actions
□ No sensitive data leakage
87. Build Priority

Don't build all these screens simultaneously.

Phase 1 — Core CRM
Login
App Shell
Dashboard
Contacts
Companies
Leads
Deals
Tasks
Activities
Phase 2 — Operational Features
Calendar
Notes
Files
Import
Export
Search
Notifications
Phase 3 — Administration
Team
Roles
Permissions
Pipelines
Custom Fields
Tags
Audit Log
Security
Phase 4 — Advanced CRM
Reports
Report Builder
Automations
Integrations
API Keys
Webhooks
Advanced Dashboards

One important product decision: don't try to make every screen equally sophisticated on day one. The heart of the CRM is Contacts → Companies → Leads → Deals → Activities → Tasks. If those six areas are extremely good, the product already feels like a real CRM. Everything else should build around them rather than competing with them.
