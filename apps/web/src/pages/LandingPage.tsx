import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { ArrowRight, Users, Building2, Target, Calendar, FileText, BarChart3 } from 'lucide-react';

const features = [
  { name: 'Contacts', href: '/app/contacts', icon: Users },
  { name: 'Companies', href: '/app/companies', icon: Building2 },
  { name: 'Leads', href: '/app/leads', icon: Target },
  { name: 'Deals', href: '/app/deals', icon: BarChart3 },
  { name: 'Activities', href: '/app/activities', icon: Calendar },
  { name: 'Notes', href: '/app/notes', icon: FileText },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-primary">CRM</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="secondary" size="sm">Sign in</Button>
              </Link>
              <Link to="/app/dashboard">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Manage relationships, not spreadsheets.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              A minimal, production-grade CRM for teams that need contacts, companies, leads, deals, and activity tracking — without the bloat.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to="/app/dashboard">
                <Button size="lg">
                  Open Dashboard
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link to="/app/contacts">
                <Button variant="secondary" size="lg">Explore Contacts</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold text-foreground text-center">Core Modules</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Start with the essentials, then expand as you need.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Link
                  key={feature.name}
                  to={feature.href}
                  className="group relative rounded-lg border border-border bg-background p-6 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <feature.icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{feature.name}</h3>
                      <p className="text-xs text-muted-foreground">Manage {feature.name.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-primary">
                    Open <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-semibold text-foreground">Ready to use it?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Jump straight into the app and start managing your pipeline.
            </p>
            <div className="mt-8">
              <Link to="/app/dashboard">
                <Button size="lg">
                  Launch App
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">CRM Platform</span>
          <span className="text-xs text-muted-foreground">Production-grade. Minimal. Fast.</span>
        </div>
      </footer>
    </div>
  );
}
