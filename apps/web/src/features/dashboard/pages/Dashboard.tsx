import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Users, Target, Calendar, DollarSign, BarChart3 } from 'lucide-react';
import { Button } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useDashboardSummary, useDashboardPipeline } from '../hooks/useDashboard';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function KpiCard({ title, value, icon: Icon, trend }: { title: string; value: string | number; icon: React.ElementType; trend?: string }) {
  return (
    <div className="bg-card border border-border rounded p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [error, setError] = useState<string | null>(null);
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { data: pipelineData, isLoading: pipelineLoading, error: pipelineError } = useDashboardPipeline();

  if (summaryError || pipelineError) {
    setError('Unable to load dashboard data. Please try again.');
  }

  const summary = summaryData?.data;
  const pipeline = pipelineData?.data;
  const isLoading = summaryLoading || pipelineLoading;

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your sales activity.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your sales activity.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : !summary || (summary.openDeals === 0 && summary.pipelineValue === 0 && summary.newLeads === 0) ? (
        <EmptyState
          title="Welcome to your CRM"
          description="Add contacts or create your first deal to start seeing business insights."
          action={
            <div className="flex items-center gap-2">
              <Link to="/app/contacts/new">
                <Button size="sm">Create Contact</Button>
              </Link>
              <Link to="/app/deals/new">
                <Button variant="secondary" size="sm">Create Deal</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Open Deals"
              value={summary.openDeals}
              icon={Target}
            />
            <KpiCard
              title="Pipeline Value"
              value={formatCurrency(summary.pipelineValue)}
              icon={DollarSign}
            />
            <KpiCard
              title="Won Revenue"
              value={formatCurrency(summary.wonRevenue)}
              icon={TrendingUp}
            />
            <KpiCard
              title="Win Rate"
              value={`${summary.winRate}%`}
              icon={BarChart3}
            />
            <KpiCard
              title="New Leads"
              value={summary.newLeads}
              icon={Users}
            />
            <KpiCard
              title="Qualified Leads"
              value={summary.qualifiedLeads}
              icon={Users}
            />
            <KpiCard
              title="Overdue Tasks"
              value={summary.overdueTasks}
              icon={Calendar}
            />
            <KpiCard
              title="Lost Revenue"
              value={formatCurrency(summary.lostRevenue)}
              icon={TrendingDown}
            />
          </div>

          <div className="bg-card border border-border rounded p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Sales Pipeline</h2>
            {pipeline && pipeline.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Stage</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Deals</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeline.map((stage) => (
                      <tr key={stage.stageId} className="border-b border-border last:border-0">
                        <td className="py-2 px-2 text-foreground">{stage.stageName}</td>
                        <td className="py-2 px-2 text-right text-foreground">{stage.dealCount}</td>
                        <td className="py-2 px-2 text-right text-foreground">{formatCurrency(stage.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pipeline data available.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
