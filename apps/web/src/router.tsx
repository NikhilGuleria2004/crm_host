import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import App from './App';
import { RouteGuard } from './components/RouteGuard';

function lazyNamed<T extends Record<string, unknown>>(factory: () => Promise<T>, name: keyof T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return lazy(() => factory().then((m) => ({ default: m[name] })) as Promise<{ default: any }>);
}

const ContactList = lazyNamed(() => import('./features/contacts/pages/ContactList'), 'ContactList');
const ContactCreate = lazyNamed(() => import('./features/contacts/pages/ContactCreate'), 'ContactCreate');
const ContactDetail = lazyNamed(() => import('./features/contacts/pages/ContactDetail'), 'ContactDetail');
const ContactEdit = lazyNamed(() => import('./features/contacts/pages/ContactEdit'), 'ContactEdit');
const CompanyList = lazyNamed(() => import('./features/companies/pages/CompanyList'), 'CompanyList');
const CompanyCreate = lazyNamed(() => import('./features/companies/pages/CompanyCreate'), 'CompanyCreate');
const CompanyDetail = lazyNamed(() => import('./features/companies/pages/CompanyDetail'), 'CompanyDetail');
const CompanyEdit = lazyNamed(() => import('./features/companies/pages/CompanyEdit'), 'CompanyEdit');
const ActivityFeed = lazyNamed(() => import('./features/activities/pages/ActivityFeed'), 'ActivityFeed');
const ActivityCreate = lazyNamed(() => import('./features/activities/pages/ActivityCreate'), 'ActivityCreate');
const ActivityDetail = lazyNamed(() => import('./features/activities/pages/ActivityDetail'), 'ActivityDetail');
const NoteList = lazyNamed(() => import('./features/notes/pages/NoteList'), 'NoteList');
const NoteCreate = lazyNamed(() => import('./features/notes/pages/NoteCreate'), 'NoteCreate');
const NoteDetail = lazyNamed(() => import('./features/notes/pages/NoteDetail'), 'NoteDetail');
const NoteEdit = lazyNamed(() => import('./features/notes/pages/NoteEdit'), 'NoteEdit');
const LeadList = lazyNamed(() => import('./features/leads/pages/LeadList'), 'LeadList');
const LeadCreate = lazyNamed(() => import('./features/leads/pages/LeadCreate'), 'LeadCreate');
const LeadDetail = lazyNamed(() => import('./features/leads/pages/LeadDetail'), 'LeadDetail');
const LeadEdit = lazyNamed(() => import('./features/leads/pages/LeadEdit'), 'LeadEdit');
const DealList = lazyNamed(() => import('./features/deals/pages/DealList'), 'DealList');
const DealCreate = lazyNamed(() => import('./features/deals/pages/DealCreate'), 'DealCreate');
const DealDetail = lazyNamed(() => import('./features/deals/pages/DealDetail'), 'DealDetail');
const DealEdit = lazyNamed(() => import('./features/deals/pages/DealEdit'), 'DealEdit');
const TaskList = lazyNamed(() => import('./features/tasks/pages/TaskList'), 'TaskList');
const TaskCreate = lazyNamed(() => import('./features/tasks/pages/TaskCreate'), 'TaskCreate');
const TaskDetail = lazyNamed(() => import('./features/tasks/pages/TaskDetail'), 'TaskDetail');
const TaskEdit = lazyNamed(() => import('./features/tasks/pages/TaskEdit'), 'TaskEdit');
const CalendarPage = lazyNamed(() => import('./features/calendar/pages/Calendar'), 'CalendarPage');
const NotificationsPage = lazyNamed(() => import('./features/notifications/pages/NotificationsPage'), 'NotificationsPage');
const PipelineList = lazyNamed(() => import('./features/pipelines/pages/PipelineList'), 'PipelineList');
const PipelineCreate = lazyNamed(() => import('./features/pipelines/pages/PipelineCreate'), 'PipelineCreate');
const PipelineDetail = lazyNamed(() => import('./features/pipelines/pages/PipelineDetail'), 'PipelineDetail');
const PipelineEdit = lazyNamed(() => import('./features/pipelines/pages/PipelineEdit'), 'PipelineEdit');
const ImportList = lazyNamed(() => import('./features/imports/pages/ImportList'), 'ImportList');
const ImportUpload = lazyNamed(() => import('./features/imports/pages/ImportUpload'), 'ImportUpload');
const ImportPreview = lazyNamed(() => import('./features/imports/pages/ImportPreview'), 'ImportPreview');
const ImportStatus = lazyNamed(() => import('./features/imports/pages/ImportStatus'), 'ImportStatus');
const ExportList = lazyNamed(() => import('./features/exports/pages/ExportList'), 'ExportList');
const ExportStatus = lazyNamed(() => import('./features/exports/pages/ExportStatus'), 'ExportStatus');
const CustomFieldList = lazyNamed(() => import('./features/custom-fields/pages/CustomFieldList'), 'CustomFieldList');
const CustomFieldFormPage = lazyNamed(() => import('./features/custom-fields/pages/CustomFieldForm'), 'CustomFieldFormPage');
const TagList = lazyNamed(() => import('./features/tags/pages/TagList'), 'TagList');
const TagFormPage = lazyNamed(() => import('./features/tags/pages/TagForm'), 'TagFormPage');
const LandingPage = lazyNamed(() => import('./pages/LandingPage'), 'LandingPage');
const Dashboard = lazyNamed(() => import('./features/dashboard/pages/Dashboard'), 'Dashboard');
const Reports = lazyNamed(() => import('./features/reports/pages/Reports'), 'Reports');
const SettingsTeam = lazyNamed(() => import('./features/settings/pages/SettingsTeam'), 'SettingsTeam');
const SettingsRoles = lazyNamed(() => import('./features/settings/pages/SettingsRoles'), 'SettingsRoles');
const SettingsSecurity = lazyNamed(() => import('./features/settings/pages/SettingsSecurity'), 'SettingsSecurity');
const SettingsSessions = lazyNamed(() => import('./features/settings/pages/SettingsSessions'), 'SettingsSessions');
const SettingsAuditLog = lazyNamed(() => import('./features/settings/pages/SettingsAuditLog'), 'SettingsAuditLog');
const SettingsApiKeys = lazyNamed(() => import('./features/settings/pages/SettingsApiKeys'), 'SettingsApiKeys');
const SettingsWebhooks = lazyNamed(() => import('./features/settings/pages/SettingsWebhooks'), 'SettingsWebhooks');
const SettingsIntegrations = lazyNamed(() => import('./features/settings/pages/SettingsIntegrations'), 'SettingsIntegrations');
const Login = lazyNamed(() => import('./features/auth/pages/Login'), 'Login');
const Register = lazyNamed(() => import('./features/auth/pages/Register'), 'Register');
const ForgotPassword = lazyNamed(() => import('./features/auth/pages/ForgotPassword'), 'ForgotPassword');
const ResetPassword = lazyNamed(() => import('./features/auth/pages/ResetPassword'), 'ResetPassword');
const AcceptInvitation = lazyNamed(() => import('./features/auth/pages/AcceptInvitation'), 'AcceptInvitation');
const SettingsIndex = lazyNamed(() => import('./features/settings/pages/SettingsIndex'), 'SettingsIndex');
const SettingsProfile = lazyNamed(() => import('./features/settings/pages/SettingsProfile'), 'SettingsProfile');
const SettingsOrganization = lazyNamed(() => import('./features/settings/pages/SettingsOrganization'), 'SettingsOrganization');
const NotFound = lazyNamed(() => import('./components/NotFound'), 'NotFound');

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/invite/:token',
    element: <AcceptInvitation />,
  },
  {
    path: '/app',
    element: (
      <RouteGuard requireAuth={true}>
        <App />
      </RouteGuard>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'reports', element: <Reports /> },
      { path: 'contacts', element: <ContactList /> },
      { path: 'contacts/new', element: <ContactCreate /> },
      { path: 'contacts/:id', element: <ContactDetail /> },
      { path: 'contacts/:id/edit', element: <ContactEdit /> },
      { path: 'companies', element: <CompanyList /> },
      { path: 'companies/new', element: <CompanyCreate /> },
      { path: 'companies/:id', element: <CompanyDetail /> },
      { path: 'companies/:id/edit', element: <CompanyEdit /> },
      { path: 'activities', element: <ActivityFeed /> },
      { path: 'activities/new', element: <ActivityCreate /> },
      { path: 'activities/:id', element: <ActivityDetail /> },
      { path: 'notes', element: <NoteList /> },
      { path: 'notes/new', element: <NoteCreate /> },
      { path: 'notes/:id', element: <NoteDetail /> },
      { path: 'notes/:id/edit', element: <NoteEdit /> },
      { path: 'leads', element: <LeadList /> },
      { path: 'leads/new', element: <LeadCreate /> },
      { path: 'leads/:id', element: <LeadDetail /> },
      { path: 'leads/:id/edit', element: <LeadEdit /> },
      { path: 'deals', element: <DealList /> },
      { path: 'deals/new', element: <DealCreate /> },
      { path: 'deals/:id', element: <DealDetail /> },
      { path: 'deals/:id/edit', element: <DealEdit /> },
      { path: 'tasks', element: <TaskList /> },
      { path: 'tasks/new', element: <TaskCreate /> },
      { path: 'tasks/:id', element: <TaskDetail /> },
      { path: 'tasks/:id/edit', element: <TaskEdit /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'calendar/:view', element: <CalendarPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'imports', element: <ImportList /> },
      { path: 'imports/new', element: <ImportUpload /> },
      { path: 'imports/:id', element: <ImportStatus /> },
      { path: 'imports/:id/preview', element: <ImportPreview /> },
      { path: 'exports', element: <ExportList /> },
      { path: 'exports/:id', element: <ExportStatus /> },
      { path: 'settings/custom-fields', element: <CustomFieldList /> },
      { path: 'settings/custom-fields/new', element: <CustomFieldFormPage /> },
      { path: 'settings/custom-fields/:id', element: <CustomFieldFormPage /> },
      { path: 'settings/tags', element: <TagList /> },
      { path: 'settings/tags/new', element: <TagFormPage /> },
      { path: 'settings/tags/:id', element: <TagFormPage /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings/team', element: <SettingsTeam /> },
      { path: 'settings/roles', element: <SettingsRoles /> },
      { path: 'settings/security', element: <SettingsSecurity /> },
      { path: 'settings/sessions', element: <SettingsSessions /> },
      { path: 'settings/audit-log', element: <SettingsAuditLog /> },
      { path: 'settings/api-keys', element: <SettingsApiKeys /> },
      { path: 'settings/webhooks', element: <SettingsWebhooks /> },
      { path: 'settings/integrations', element: <SettingsIntegrations /> },
      { path: 'settings/pipelines', element: <PipelineList /> },
      { path: 'settings/pipelines/new', element: <PipelineCreate /> },
      { path: 'settings/pipelines/:id', element: <PipelineDetail /> },
      { path: 'settings/pipelines/:id/edit', element: <PipelineEdit /> },
      { path: 'settings', element: <SettingsIndex /> },
      { path: 'settings/profile', element: <SettingsProfile /> },
      { path: 'settings/organization', element: <SettingsOrganization /> },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

