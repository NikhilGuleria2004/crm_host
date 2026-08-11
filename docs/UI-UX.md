UI/UX Specification
Industry-Ready CRM Platform

Version: 1.0
Status: Production / Implementation Specification
Design Direction: Minimal enterprise / government portal
Frontend: React + TypeScript + Tailwind CSS
Primary UI: Desktop-first, responsive
Accessibility Target: WCAG 2.1 AA

1. Design Objective

The CRM should feel:

professional
administrative
trustworthy
dense but readable
predictable
fast
information-oriented
accessible
suitable for long daily usage

It should not feel like:

a marketing website
a flashy SaaS dashboard
a social network
a consumer mobile app
a futuristic AI interface

The visual language should resemble an established government/enterprise information system.

The user should always understand:

Where they are.
What record they are looking at.
What actions are available.
What changed.
What requires attention.
How to get back.
2. Design Principles
2.1 Information over decoration

Prefer:

Label
Value
Action

over:

Large illustration
Huge number
Decorative graphic
2.2 Consistency over novelty

The same operation must look the same everywhere.

For example, creating a record should always use:

+ New Contact
+ New Company
+ New Deal
+ New Task

rather than different button styles for every module.

2.3 Progressive disclosure

Don't show every available field immediately.

Example:

Contact
────────────────────────

First name       Last name
Email            Phone

Company
Job title

[Show more fields]

Advanced/custom fields appear when requested.

2.4 Dense but not cramped

CRM users often work with hundreds or thousands of records.

Tables should therefore prioritize information density.

Default row height:

44–48px

Compact mode:

36–40px
3. Global Design Tokens
3.1 Colors

Use the supplied palette.

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
  --color-muted-foreground: #6B7280;

  --color-success: #15803D;
  --color-warning: #CA8A04;
  --color-danger: #B91C1C;
}
4. Semantic Color Usage

Colors should communicate meaning rather than decoration.

Color	Meaning
Primary	Main navigation / primary actions
Blue accent	Links / focus / secondary emphasis
Green	Success / active / completed
Yellow	Warning / pending
Red	Errors / destructive actions
Gray	Secondary information

Never use red merely because it looks visually strong.

5. Typography

Primary font:

font-family:
  "JetBrains Mono",
  ui-monospace,
  monospace;

Typography should remain restrained.

Page title
20–24px
font-weight: 600
Section title
16–18px
font-weight: 600
Body
14px
line-height: 1.5
Metadata
12–13px
color: muted
Labels
11–12px
font-weight: 500
text-transform: uppercase
letter-spacing: 0.04em
6. Spacing System

Use a consistent spacing scale.

4px
8px
12px
16px
20px
24px
32px
40px
48px
64px

Most application screens should use:

Page padding: 24px
Card padding: 20–24px
Form gap: 16px
Section gap: 24–32px

Avoid arbitrary spacing values.

7. Border System

Borders should be subtle.

border-color: #D6DCE5;

Default radius:

4–6px

Avoid excessive rounded corners.

Do not use:

rounded-full

for normal UI components.

Reserve pills for statuses/tags.

8. Shadows

The product should be mostly flat.

Use shadows only when elevation is necessary:

modal
dropdown
command palette
floating panel

Cards should primarily use:

border + background

rather than large shadows.

9. Application Layout

Desktop layout:

┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
│ Logo │ Search                         Help  Notifications User│
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│ SIDEBAR       │ PAGE                                         │
│               │                                              │
│ Dashboard     │ Breadcrumb                                   │
│ Contacts      │ Page Header                                  │
│ Companies     │                                              │
│ Leads         │ Content                                      │
│ Deals         │                                              │
│ Tasks         │                                              │
│ Calendar      │                                              │
│ Reports       │                                              │
│               │                                              │
│ ────────────  │                                              │
│ Settings      │                                              │
└───────────────┴──────────────────────────────────────────────┘
10. Sidebar

Width:

240px

Collapsed:

64px

Sidebar sections:

WORKSPACE

Dashboard
Contacts
Companies
Leads
Deals
Tasks
Calendar
Activities

ANALYTICS

Reports
Dashboards

ADMINISTRATION

Settings

Active navigation:

background: subtle primary tint
border-left: 3px primary
text: primary

Do not use enormous icons.

Icons:

16–18px
11. Header

Header height:

56–64px

Left:

Breadcrumb / page context

Center:

Global search

Right:

Help
Notifications
User menu

Global search should support:

Contacts
Companies
Deals
Tasks
Commands

Example:

┌────────────────────────────────────────────┐
│ Search contacts, companies, deals...   ⌘K │
└────────────────────────────────────────────┘
12. Page Header

Every major page should have a consistent header.

Contacts

Manage contacts and customer relationships.

                         [Import] [Export] [+ New Contact]

Structure:

Breadcrumb
Page title
Description
Actions

Do not put actions randomly throughout the page.

13. Breadcrumbs

Example:

Contacts / Acme Corporation / John Smith

Clickable except current page.

Use breadcrumbs for deep navigation.

14. Buttons
Primary
[ + New Contact ]

Use for the primary action on a page.

Secondary
[ Import ]
[ Export ]
[ Filters ]
Destructive
[ Delete Contact ]

Destructive actions must visually stand apart.

15. Button Rules

Avoid having several competing primary buttons.

Bad:

[Save] [Update] [Create] [Export]

Good:

[Save Changes]     [Cancel]

And secondary operations elsewhere.

16. Forms

Forms should use two-column layouts where appropriate.

Contact Information

First Name                 Last Name
[________________]         [________________]

Email                      Phone
[________________]         [________________]

Company                    Job Title
[________________]         [________________]

On smaller screens:

First Name
[________________]

Last Name
[________________]

Email
[________________]
17. Form Labels

Never rely on placeholder text as the label.

Correct:

Email address
[ john@example.com ]

Incorrect:

[ Email address ]

The label must remain visible after input.

18. Form Validation

Validation should happen:

while editing when useful
on blur
on submit

Example:

Email address

[ john@example ]

Invalid email address.

Errors should appear next to the relevant field.

Don't display a generic:

Something went wrong.

when the system knows exactly what went wrong.

19. Tables

Tables are the primary CRM interface.

Example:

Contacts

[ Search... ] [Filters] [Views] [Columns] [Export] [+ New Contact]

☐  NAME              COMPANY       EMAIL              OWNER
──────────────────────────────────────────────────────────────
☐  John Smith        Acme Ltd      john@acme.com      Alex
☐  Sarah Jones       Globex        sarah@globex.com    Maria
☐  David Brown       Initech       david@initech.com   Alex
20. Table Behavior

Every major table should support:

sorting
pagination
filters
search
column selection
row selection
bulk actions
saved views
export
empty state
loading state
error state
21. Bulk Actions

When records are selected:

3 contacts selected

[Assign] [Tag] [Export] [Delete]

The bulk action bar should replace or sit above the normal toolbar.

22. Filters

Filters should open in a side drawer or popover.

Example:

FILTERS
──────────────────────

Status
☐ Active
☐ Inactive
☐ Lead

Owner
[ Select owner ]

Created
[ Date range ]

Tags
[ Select tags ]

          [Clear] [Apply]

Active filters should appear above the table:

Status: Active ×
Owner: Alex ×
23. Saved Views

Users should be able to save frequently used table configurations.

Example:

Views

All Contacts
My Contacts
Recently Added
Inactive
High Value

A saved view contains:

filters
columns
sort order
pagination preference
24. Empty States

Never show a blank page.

Good:

No contacts found

There are no contacts matching your current filters.

[Clear Filters]

For a completely empty module:

No contacts yet

Create your first contact to start managing
your customer relationships.

[+ Create Contact]
25. Loading States

Use skeletons for initial page loading.

Example:

████████████████
██████████

████████████████████████
████████████████████

Avoid showing a giant spinner for the entire application.

26. Error States

Example:

Unable to load contacts

We couldn't retrieve your contacts.
Please try again.

[Try Again]

For API errors, provide a request/reference ID where appropriate.

27. Contact Detail Page

The contact page is one of the most important screens.

Layout:

Contacts / John Smith

John Smith
Senior Manager · Acme Corporation

[Edit] [More]

────────────────────────────────────────────

Overview
Activity
Deals
Tasks
Notes
Files

────────────────────────────────────────────

CONTACT INFORMATION

Email
john@example.com

Phone
+91 ...

Company
Acme Corporation

Owner
Alex Kumar

────────────────────────────────────────────

ACTIVITY

Today
────────────────
10:30  Call completed
09:15  Email sent

Yesterday
────────────────
...
28. Contact Detail Header

Header should contain:

Avatar / initials

John Smith
Senior Manager
Acme Corporation

Status: Active

Actions:

[Edit]
[Log Activity]
[Create Task]
[More]
29. Company Detail Page
Acme Corporation

Technology · Enterprise

[Edit] [More]

Overview | Contacts | Deals | Activities | Notes | Files

Key metrics:

Contacts       Open Deals       Revenue       Activities
24             5                ₹42L          184

Then:

Company Information
Contacts
Open Deals
Recent Activity
30. Leads

Lead management should use both:

Table view
Lead
Company
Source
Status
Score
Owner
Created
Kanban view
NEW
────────────────
Lead A
Lead B

CONTACTED
────────────────
Lead C

QUALIFIED
────────────────
Lead D

CONVERTED
────────────────
Lead E

Users should be able to switch:

[Table] [Kanban]
31. Deal Pipeline

Pipeline is a core CRM screen.

Sales Pipeline

[Pipeline: Enterprise Sales ▼]

NEW             QUALIFIED       PROPOSAL       NEGOTIATION
────────────────────────────────────────────────────────────

Acme Deal       Globex Deal     Initech        Umbrella
₹12L            ₹8L             ₹15L           ₹20L

Example Corp    Another Deal
₹5L             ₹4L

Each column should display:

Stage name
Number of deals
Total value

Example:

QUALIFIED
8 deals
₹48,00,000
32. Deal Card
Acme Enterprise Contract

Acme Corporation

₹12,00,000

Alex Kumar
Closing: 24 Aug 2026

● High Priority

Cards should remain compact.

33. Deal Detail
Acme Enterprise Contract

₹12,00,000
Proposal

Owner: Alex Kumar
Expected close: 24 Aug 2026

[Edit] [Move Stage] [More]

Sections:

Deal Information
Contacts
Company
Activities
Tasks
Notes
Files
Timeline
34. Activities

Activities should form a unified timeline.

Types:

Call
Email
Meeting
Note
Status Change
Task
Deal Change
Assignment

Timeline:

TODAY

10:45 AM
Call completed
John Smith

10:15 AM
Deal moved from Proposal → Negotiation
Alex Kumar

09:30 AM
Task completed
Follow up with Acme
35. Activity Composer

Users should have a quick activity composer.

Log activity

[Call] [Email] [Meeting] [Note]

Subject
[________________________]

Description
[________________________]
[________________________]

Date
[ 07 Aug 2026 ]

[Cancel] [Save Activity]
36. Tasks

Tasks should support:

Task title
Description
Assignee
Due date
Priority
Related record
Status

Statuses:

TODO
IN_PROGRESS
COMPLETED
CANCELLED

Priorities:

LOW
MEDIUM
HIGH
URGENT
37. Task List
Tasks

[Search] [Filters] [+ New Task]

☐ Follow up with Acme
  Due today · High · Alex

☐ Send proposal to Globex
  Due tomorrow · Medium · Maria

☑ Call John Smith
  Completed · Alex
38. Calendar

Calendar should support:

Month
Week
Day
Agenda

Activities and tasks should appear together.

Example:

MON 10        TUE 11        WED 12
────────────────────────────────────

09:00
Call Acme

11:00
Meeting Globex

14:00
Follow-up
39. Dashboard

Dashboard should answer:

"What is happening in my business?"

Top-level metrics:

Open Deals       Pipeline Value       Won Revenue
42               ₹2.4 Cr              ₹48 L

Then:

Sales Pipeline
────────────────────────

New            ₹24L
Qualified      ₹42L
Proposal       ₹65L
Negotiation    ₹82L

Then:

Recent Activities
Upcoming Tasks
Deals Closing Soon
Lead Conversion

Avoid filling the dashboard with meaningless charts.

40. Dashboard Personalization

Users should eventually be able to configure widgets.

Widgets:

Revenue
Pipeline
Deals
Lead Conversion
Tasks
Activities
Sales Leaderboard
Recent Contacts

Each widget should have:

title
date range
filters
data source
position
size
41. Reports

Reports should be table-first.

Example:

Sales Performance

Date Range: [01 Jul — 31 Jul]

────────────────────────────────────────

Sales Rep       Deals Won      Revenue
Alex Kumar      12             ₹24L
Maria Singh     9              ₹18L
John Doe        6              ₹12L

Charts can supplement tables.

Never make a chart the only way to understand important data.

42. Global Search

Keyboard shortcut:

⌘K

or:

Ctrl + K

Search should return grouped results.

Search

CONTACTS
John Smith
John Doe

COMPANIES
Johnsons Ltd

DEALS
Johnsons Enterprise Contract

TASKS
Call John Smith
43. Command Palette

Command palette should support actions.

Search or type a command...

Create Contact
Create Company
Create Deal
Create Task

Go to Contacts
Go to Deals
Go to Reports

Open Settings
44. Notifications

Notifications should be useful, not noisy.

Types:

Task assigned
Deal assigned
Mention
Task due
Deal changed
Import completed
Automation failed
Integration error

Notification panel:

Notifications

TODAY

Alex assigned you a task
5 minutes ago

Deal "Acme Contract" moved to Negotiation
1 hour ago

Import completed
2 hours ago
45. Settings UX

Settings should use a secondary navigation.

Settings

GENERAL
Profile
Organization

USERS & ACCESS
Team
Roles & Permissions

CRM
Pipelines
Custom Fields
Tags

COMMUNICATION
Notifications
Email

INTEGRATIONS
Integrations
API Keys
Webhooks

SECURITY
Security
Sessions
Audit Log
46. Custom Fields

Administrators should be able to define custom fields.

Example:

Custom Fields

Contacts

Field Name          Type          Required
────────────────────────────────────────────
Customer ID         Text          Yes
Industry            Select        No
Annual Revenue      Currency      No
Renewal Date        Date          No

Supported types:

Text
Long Text
Number
Currency
Percentage
Date
Date Time
Boolean
Select
Multi Select
Email
Phone
URL
User
Company
Contact
47. Tags

Tags should be simple.

Example:

Enterprise
VIP
High Value
Renewal
Partner
Cold Lead

Tags can be used for:

filtering
segmentation
automation
reporting
48. Import UX

Import flow:

1. Upload
      ↓
2. Map columns
      ↓
3. Validate
      ↓
4. Preview
      ↓
5. Import
      ↓
6. Results

Example:

Upload Contacts

Drag CSV here

or

[Choose File]

Mapping:

CSV Column          CRM Field

First Name    →     First Name
Last Name     →     Last Name
Email         →     Email
Company       →     Company
49. Import Validation

Before committing:

Import Preview

1,248 records

Valid:       1,213
Warnings:       28
Errors:          7
Duplicates:     19

Users should be able to inspect problematic rows.

50. Export

Export should respect:

permissions
filters
selected records
visible columns

Example:

Export Contacts

Format
○ CSV
○ Excel

Records
○ Current view
○ Selected records
○ All accessible records

[Export]
51. Confirmation Dialogs

Use confirmation dialogs for destructive operations.

Delete Contact?

This will remove John Smith from your contacts.

[Cancel] [Delete Contact]

For bulk operations:

Delete 43 contacts?

This action cannot be undone.

[Cancel] [Delete 43 Contacts]
52. Destructive Action Rules

Delete should never be:

the largest button
the default focused button
next to primary action without separation

Prefer:

[Save Changes] [Cancel]

More ⋮
────────────
Delete
53. Toast Notifications

Use toasts for completed actions.

Examples:

✓ Contact created successfully
✓ Changes saved
✓ 24 contacts imported

Errors:

Unable to save changes.
Try again.

Toasts should not contain critical information that disappears before the user can act on it.

54. Responsive Design

Desktop is the primary environment.

Breakpoints:

≥ 1280px   Full desktop
1024–1279  Compact desktop
768–1023   Tablet
<768px     Mobile
55. Mobile Behavior

Do not simply shrink desktop tables.

On mobile:

Desktop table
      ↓
Record cards

Example:

John Smith
Acme Corporation

john@example.com
+91 XXXXX XXXXX

Owner: Alex
Status: Active

[View]

The sidebar becomes a drawer.

56. Accessibility

Target:

WCAG 2.1 AA

Requirements:

keyboard navigation
visible focus states
semantic HTML
accessible labels
screen-reader support
sufficient color contrast
no color-only status indicators
keyboard-accessible dialogs
keyboard-accessible dropdowns
accessible tables
accessible form errors

Example:

Instead of:

🔴

use:

● Inactive

with the appropriate color as an additional visual cue.

57. Keyboard Navigation

Important shortcuts:

⌘/Ctrl + K
Global search

N
New record

G then D
Dashboard

G then C
Contacts

G then L
Leads

G then O
Deals

Keyboard shortcuts should never interfere with typing inside forms.

58. Record Navigation

Users should be able to move between records without returning to the table.

Example:

John Smith

< Previous     14 / 248     Next >

This is particularly important for support and sales teams processing many records.

59. Detail Drawer

For quick inspection, use drawers.

Example:

┌─────────────────────────────┐
│ Contact                 ×   │
│                             │
│ John Smith                  │
│ Acme Corporation            │
│                             │
│ Email                       │
│ john@example.com            │
│                             │
│ Phone                       │
│ ...                         │
│                             │
│ [Open Full Record]          │
└─────────────────────────────┘

Use drawers for quick views.

Use full pages for complex editing.

60. UX for Unsaved Changes

If a user modifies a form and attempts to leave:

Unsaved changes

You have unsaved changes.
Are you sure you want to leave?

[Stay] [Discard Changes]
61. Permission-Based UI

UI must respect permissions.

If a user cannot delete contacts:

Don't show:

Delete

If they can view but not edit:

Show:

Contact information

without editable controls.

However, backend authorization remains mandatory.

Hiding a button is not security.

62. Audit Log UI

Audit logs should be readable.

AUDIT LOG

Date          User        Action
────────────────────────────────────────────
07 Aug 10:42  Alex        Updated contact
07 Aug 10:38  Maria       Created deal
07 Aug 09:15  Alex        Assigned task

Detail view:

Contact updated

User:
Alex Kumar

Changed:
Status

Before:
Lead

After:
Customer

IP:
...

Time:
07 Aug 2026 10:42
63. System Status

For serious enterprise software, provide a system status area.

Possible states:

All systems operational

or:

Some services are experiencing issues

This is especially useful once integrations/background processing exist.

64. Error Page Design
404
Page not found

The page you're looking for doesn't exist
or you don't have access to it.

[Go to Dashboard]
403
Access denied

You don't have permission to access this resource.

[Go Back]
500
Something went wrong

An unexpected error occurred.

Reference: ERR-7F82A1

[Try Again]
65. Authentication Screens

Login should be extremely simple.

┌───────────────────────────────────┐
│                                   │
│             CRM                   │
│                                   │
│ Sign in                           │
│                                   │
│ Email                             │
│ [____________________________]    │
│                                   │
│ Password                          │
│ [____________________________]    │
│                                   │
│ [ Sign In ]                       │
│                                   │
│ Forgot password?                  │
│                                   │
└───────────────────────────────────┘

No marketing content is necessary.

66. Onboarding

After organization creation:

Welcome to CRM

Let's configure your workspace.

1. Organization
2. Team
3. Pipeline
4. Import contacts
5. Done

Progress:

●───●───○───○───○
1   2   3   4   5

Allow users to skip optional steps.

67. First-Time Empty Dashboard

Instead of showing empty charts:

Welcome to your CRM

You haven't added any data yet.

Start by:

[Import Contacts]

or

[Create Contact]

Then configure your sales pipeline.
68. Search and Filtering UX Rules

Search should be:

fast
forgiving
debounced
case-insensitive
capable of partial matches

Filters should persist while navigating where reasonable.

For example:

Contacts
Status: Active

When opening a contact and returning, the user should not unexpectedly lose the filter.

69. Data Density

Default table density:

Comfortable

Optional:

Compact

Settings:

Display density

○ Comfortable
○ Compact
70. Dark Mode

Dark mode should be available but should not compromise the government/enterprise visual language.

Use the provided dark tokens.

Avoid making dark mode pure neon/high contrast.

The interface should remain:

flat
quiet
high readability
low decoration
71. Motion

Animation should be minimal.

Use transitions primarily for:

drawer opening
modal opening
dropdowns
toast appearance
hover/focus

Duration:

100–200ms

Avoid:

page transitions
bouncing elements
animated statistics
excessive skeleton animations
parallax
decorative motion
72. Icons

Use one icon system consistently.

Recommended style:

16px–18px
stroke-based

Icons must have tooltips when their meaning isn't obvious.

Do not use icons without labels for destructive or important actions.

73. Status Badges

Example:

[ Active ]
[ Pending ]
[ Qualified ]
[ Closed Won ]
[ Closed Lost ]

Status badges should be compact.

Example semantics:

Active       → success
Pending      → warning
Error        → danger
Neutral      → muted
74. Priority Indicators

Use:

Low
Medium
High
Urgent

Don't rely purely on red/yellow/green.

Example:

Priority: High

with color as secondary reinforcement.

75. Notifications and Feedback

Every asynchronous action should communicate state.

Example:

Uploading...

████████████░░░░ 72%

Then:

✓ Upload completed

If failed:

Upload failed

File exceeds the maximum allowed size.

[Choose Another File]
76. Performance UX

The UI should feel responsive even with large datasets.

Required behaviors:

pagination for large tables
server-side filtering
server-side sorting
debounced search
optimistic UI only where safe
skeleton loading
lazy-loaded modules
virtualized lists where necessary

Never load thousands of CRM records into the browser just to filter them locally.

77. Important UX Rule: Don't Over-Dashboard

A common CRM design mistake is turning every piece of data into a chart.

The primary experience should be:

Tables
Records
Timeline
Tasks
Pipeline

Dashboards and analytics are secondary.

Users spend more time managing records than admiring charts.

78. Primary Navigation Hierarchy

Final navigation:

WORKSPACE

Dashboard

CRM
├── Contacts
├── Companies
├── Leads
└── Deals

WORK
├── Tasks
├── Calendar
└── Activities

ANALYTICS
├── Reports
└── Dashboards

ADMIN
└── Settings

This should remain stable throughout the product.

79. Critical User Flows

The UI must fully support these flows.

Create Contact
Contacts
 ↓
+ New Contact
 ↓
Form
 ↓
Validation
 ↓
Save
 ↓
Contact detail
 ↓
Success notification
Create Deal
Deals
 ↓
+ New Deal
 ↓
Select company/contact
 ↓
Enter value
 ↓
Select pipeline/stage
 ↓
Save
 ↓
Deal detail
Move Deal
Pipeline
 ↓
Drag deal
 ↓
New stage
 ↓
Confirmation if necessary
 ↓
Activity recorded
Import Contacts
Import
 ↓
Upload
 ↓
Map
 ↓
Validate
 ↓
Preview
 ↓
Import
 ↓
Result
Assign Task
Task
 ↓
Assign user
 ↓
Set due date
 ↓
Save
 ↓
Notification
80. Design Acceptance Criteria

A screen should not be considered production-ready unless it has:

Required
loading state
empty state
error state
success feedback
permission handling
responsive behavior
keyboard accessibility
validation
consistent spacing
consistent typography
consistent buttons
consistent navigation
For tables
search
filters
pagination
sorting
row actions
bulk actions where applicable
For forms
validation
required fields
error states
loading state
unsaved-change protection
success feedback
81. Component Naming Convention

Use predictable names.

ContactTable
ContactFilters
ContactForm
ContactHeader
ContactTimeline
ContactActivity
ContactDrawer

DealTable
DealFilters
DealForm
DealPipeline
DealCard
DealTimeline

Avoid generic names such as:

Thing
Box
Panel2
Container3
NewComponent
82. Frontend Feature Structure

Recommended:

features/
├── contacts/
│   ├── api/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── schemas/
│   ├── types/
│   └── utils/
│
├── companies/
├── leads/
├── deals/
├── tasks/
├── activities/
├── reports/
└── settings/
83. UI State Categories

Separate:

Server state
contacts
deals
companies
tasks
UI state
modalOpen
sidebarCollapsed
selectedRows
activeTab
Form state
contactForm
dealForm
Session state
currentUser
organization
permissions

Do not put all application state into one giant global store.

84. Design System File Structure
src/components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Drawer.tsx
│   ├── Badge.tsx
│   ├── Table.tsx
│   ├── Pagination.tsx
│   └── ...
│
├── layout/
│   ├── AppShell.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── PageHeader.tsx
│
└── feedback/
    ├── EmptyState.tsx
    ├── ErrorState.tsx
    ├── LoadingState.tsx
    └── Toast.tsx
85. Final Visual Direction

The product should look approximately like:

┌─────────────────────────────────────────────────────────────┐
│ CRM              Search...                    ● Alex Kumar  │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│ Dashboard   │ Contacts                                      │
│             │ Manage contacts and relationships              │
│ Contacts    │                                               │
│ Companies   │ [Search...] [Filters] [Export] [+ Contact]   │
│ Leads       │                                               │
│ Deals       │ ┌───────────────────────────────────────────┐ │
│             │ │ ☐ Name      Company      Status    Owner │ │
│ Tasks       │ │─────────────────────────────────────────│ │
│ Calendar    │ │ ☐ John      Acme         Active    Alex │ │
│             │ │ ☐ Sarah     Globex       Lead      Maria│ │
│ Reports     │ │ ☐ David     Initech      Active    Alex │ │
│             │ └───────────────────────────────────────────┘ │
│ Settings    │                                               │
│             │              1–25 of 248                      │
└─────────────┴───────────────────────────────────────────────┘

The important thing is that the UI should feel like an operational system rather than a presentation.

86. Definition of UI/UX Done

The CRM UI/UX specification is considered implemented when:

✓ Every major entity has list + detail + create + edit views

✓ Every list supports loading/empty/error states

✓ Tables support search/filter/sort/pagination

✓ Forms have validation and unsaved-change handling

✓ All destructive actions require appropriate confirmation

✓ Permissions affect visible actions

✓ Every important action produces feedback

✓ Desktop/tablet/mobile layouts are defined

✓ Keyboard navigation works

✓ WCAG 2.1 AA requirements are addressed

✓ Global search works consistently

✓ Navigation remains consistent across modules

✓ Design tokens are centralized

✓ Components are reusable

✓ Dark mode follows the defined token system

✓ No module invents its own visual language

This is the UI/UX contract the frontend should be built against. The next useful artifact after this would be a screen-by-screen UI specification with every route broken down into exact components, states, fields, tables, actions, modals, and interactions — essentially a build checklist for the React implementation.
