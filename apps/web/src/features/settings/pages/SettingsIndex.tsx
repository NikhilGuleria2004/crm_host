import { Link, Outlet } from 'react-router-dom';
import {
  User, Building, Users, Shield, Layers, Tag, Bell,
  Globe, Key, Webhook, Lock, Clock, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@crm/ui';

interface SettingsSection {
  title: string;
  description: string;
  href: string;
  icon: typeof User;
}

const sections: SettingsSection[] = [
  {
    title: 'Profile',
    description: 'Manage your personal information and preferences.',
    href: '/app/settings/profile',
    icon: User,
  },
  {
    title: 'Organization',
    description: 'Organization name, currency, timezone, and logo.',
    href: '/app/settings/organization',
    icon: Building,
  },
  {
    title: 'Team',
    description: 'Manage team members and invitations.',
    href: '/app/settings/team',
    icon: Users,
  },
  {
    title: 'Roles & Permissions',
    description: 'Define roles and assign permissions.',
    href: '/app/settings/roles',
    icon: Shield,
  },
  {
    title: 'Pipelines',
    description: 'Configure sales pipelines and stages.',
    href: '/app/settings/pipelines',
    icon: Layers,
  },
  {
    title: 'Custom Fields',
    description: 'Add custom fields to your entities.',
    href: '/app/settings/custom-fields',
    icon: Tag,
  },
  {
    title: 'Tags',
    description: 'Manage tags and tagging rules.',
    href: '/app/settings/tags',
    icon: Tag,
  },
  {
    title: 'Notifications',
    description: 'Configure notification preferences.',
    href: '/app/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Integrations',
    description: 'Connect third-party services.',
    href: '/app/settings/integrations',
    icon: Globe,
  },
  {
    title: 'API Keys',
    description: 'Manage API keys for programmatic access.',
    href: '/app/settings/api-keys',
    icon: Key,
  },
  {
    title: 'Webhooks',
    description: 'Configure outgoing webhooks.',
    href: '/app/settings/webhooks',
    icon: Webhook,
  },
  {
    title: 'Security',
    description: 'Password and two-factor authentication.',
    href: '/app/settings/security',
    icon: Lock,
  },
  {
    title: 'Sessions',
    description: 'View and manage active sessions.',
    href: '/app/settings/sessions',
    icon: Clock,
  },
  {
    title: 'Audit Log',
    description: 'Review audit events for your organization.',
    href: '/app/settings/audit-log',
    icon: FileText,
  },
];

export function SettingsIndex() {
  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your workspace and preferences.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link key={section.href} to={section.href}>
            <Card className="h-full transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <section.icon size={20} className="text-primary" />
                  <span className="font-medium text-foreground">{section.title}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
