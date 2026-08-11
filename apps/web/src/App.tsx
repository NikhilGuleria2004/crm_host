import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, HelpCircle, ChevronDown } from 'lucide-react';
import { Button } from '@crm/ui';
import { Dropdown, DropdownItem, DropdownDivider } from '@crm/ui';
import { NotificationBell } from './features/notifications/components/NotificationBell';
import { GlobalSearch } from './features/search/components/GlobalSearch';
import { useAuth } from './features/auth/context/AuthContext';
import { setSessionExpiredHandler, clearSessionExpiredHandler } from './lib/session';
import { queryClient } from './query-client';

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard' },
  { name: 'Contacts', href: '/app/contacts' },
  { name: 'Companies', href: '/app/companies' },
  { name: 'Leads', href: '/app/leads' },
  { name: 'Deals', href: '/app/deals' },
  { name: 'Tasks', href: '/app/tasks' },
  { name: 'Calendar', href: '/app/calendar' },
  { name: 'Activities', href: '/app/activities' },
];

const secondaryNavigation = [
  { name: 'Reports', href: '/app/reports' },
  { name: 'Settings', href: '/app/settings' },
  { name: 'Profile', href: '/app/settings/profile' },
  { name: 'Organization', href: '/app/settings/organization' },
  { name: 'Roles', href: '/app/settings/roles' },
  { name: 'Security', href: '/app/settings/security' },
  { name: 'Sessions', href: '/app/settings/sessions' },
  { name: 'Audit Log', href: '/app/settings/audit-log' },
  { name: 'API Keys', href: '/app/settings/api-keys' },
  { name: 'Webhooks', href: '/app/settings/webhooks' },
  { name: 'Integrations', href: '/app/settings/integrations' },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname.split('/')[2];
    return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppShell
        navigation={navigation}
        secondaryNavigation={secondaryNavigation}
        pageTitle={getPageTitle()}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onSearchOpen={() => setSearchOpen(true)}
      >
        <Outlet />
      </AppShell>
      <GlobalSearch key={searchOpen ? 'open' : 'closed'} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  navigation: Array<{ name: string; href: string }>;
  secondaryNavigation: Array<{ name: string; href: string }>;
  pageTitle: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSearchOpen: () => void;
}

function AppShell({ children, navigation, secondaryNavigation, pageTitle, sidebarOpen, onToggleSidebar, onSearchOpen }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setShowSessionModal(true);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    });
    return () => clearSessionExpiredHandler();
  }, []);

  const handleSessionExpiredSignIn = () => {
    setShowSessionModal(false);
    navigate('/login', { replace: true });
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '';
  const displayName = user ? `${user.firstName} ${user.lastName}` : '';

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleProfile = () => {
    navigate('/app/settings/profile');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg shadow-xl p-8 max-w-md text-center mx-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your session has expired.</h2>
            <p className="text-muted-foreground mb-6">Please sign in again to continue.</p>
            <Button onClick={handleSessionExpiredSignIn}>Sign In</Button>
          </div>
        </div>
      )}
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onToggleSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <span className="text-lg font-semibold text-primary">CRM</span>
          <button className="lg:hidden text-muted hover:text-foreground" onClick={onToggleSidebar}>
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onToggleSidebar}
              className={({ isActive }) =>
                `block px-3 py-2 text-sm rounded transition-colors ${
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
          <div className="pt-4 mt-4 border-t border-border">
            {secondaryNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onToggleSidebar}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm rounded transition-colors ${
                    isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-muted hover:text-foreground" onClick={onToggleSidebar}>
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={onSearchOpen}>
              <Search size={16} className="mr-2" />
              Search
            </Button>
            <Button variant="ghost" size="sm" className="sm:hidden" onClick={onSearchOpen}>
              <Search size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <HelpCircle size={16} className="mr-2" />
              Help
            </Button>
            <NotificationBell />
            <Dropdown
              trigger={
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    {initials}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
                  <ChevronDown size={14} />
                </Button>
              }
              align="right"
            >
              <DropdownItem onClick={handleProfile}>Profile</DropdownItem>
              <DropdownItem>Preferences</DropdownItem>
              <DropdownDivider />
              <DropdownItem destructive onClick={handleSignOut}>Sign out</DropdownItem>
            </Dropdown>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
