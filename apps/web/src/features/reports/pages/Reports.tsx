import { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { Button } from '@crm/ui';
import { Select } from '@crm/ui';
import { Input } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useSalesReport, usePipelineReport, useLeadsReport, useActivityReport } from '../hooks/useReports';
import type { SalesReportResponse, PipelineReportResponse, LeadConversionReportResponse, ActivityReportResponse } from '../api/reports';

type ReportType = 'sales' | 'pipeline' | 'leads' | 'activity';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number) {
  return `${value}%`;
}

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [pipelineId, setPipelineId] = useState('');

  const salesQuery = useSalesReport({
    from: from || undefined,
    to: to || undefined,
    ownerId: ownerId || undefined,
    pipelineId: pipelineId || undefined,
  });

  const pipelineQuery = usePipelineReport({
    from: from || undefined,
    to: to || undefined,
  });

  const leadsQuery = useLeadsReport({
    from: from || undefined,
    to: to || undefined,
  });

  const activityQuery = useActivityReport({
    from: from || undefined,
    to: to || undefined,
    ownerId: ownerId || undefined,
  });

  const getActiveQuery = () => {
    switch (reportType) {
      case 'sales':
        return salesQuery;
      case 'pipeline':
        return pipelineQuery;
      case 'leads':
        return leadsQuery;
      case 'activity':
        return activityQuery;
    }
  };

  const activeQuery = getActiveQuery();
  const data = activeQuery.data?.data;
  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error as Error | null;

  const handleExport = async () => {
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      if (ownerId) qs.set('ownerId', ownerId);
      if (pipelineId) qs.set('pipelineId', pipelineId);
      const query = qs.toString();
      const response = await fetch(`/api/v1/reports/sales/export${query ? `?${query}` : ''}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales-report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const renderSalesReport = (data: SalesReportResponse) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <div className="bg-card border border-border rounded p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
        <p className="text-xl font-semibold text-foreground mt-1">{formatCurrency(data.revenue)}</p>
      </div>
      <div className="bg-card border border-border rounded p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Won Deals</p>
        <p className="text-xl font-semibold text-foreground mt-1">{data.wonDeals}</p>
      </div>
      <div className="bg-card border border-border rounded p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Lost Deals</p>
        <p className="text-xl font-semibold text-foreground mt-1">{data.lostDeals}</p>
      </div>
      <div className="bg-card border border-border rounded p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Deal Size</p>
        <p className="text-xl font-semibold text-foreground mt-1">{formatCurrency(data.averageDealSize)}</p>
      </div>
      <div className="bg-card border border-border rounded p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Win Rate</p>
        <p className="text-xl font-semibold text-foreground mt-1">{formatPercent(data.winRate)}</p>
      </div>
    </div>
  );

  const renderPipelineReport = (data: PipelineReportResponse[]) => (
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
          {data.map((stage) => (
            <tr key={stage.stageId} className="border-b border-border last:border-0">
              <td className="py-2 px-2 text-foreground">{stage.stageName}</td>
              <td className="py-2 px-2 text-right text-foreground">{stage.dealCount}</td>
              <td className="py-2 px-2 text-right text-foreground">{formatCurrency(stage.dealValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderLeadsReport = (data: LeadConversionReportResponse[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Source</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Leads</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Qualified</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Converted</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Conversion Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="py-2 px-2 text-foreground">{row.source}</td>
              <td className="py-2 px-2 text-right text-foreground">{row.leads}</td>
              <td className="py-2 px-2 text-right text-foreground">{row.qualified}</td>
              <td className="py-2 px-2 text-right text-foreground">{row.converted}</td>
              <td className="py-2 px-2 text-right text-foreground">{formatPercent(row.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderActivityReport = (data: ActivityReportResponse[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-muted-foreground font-medium">User</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Calls</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Emails</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Meetings</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Tasks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.userId} className="border-b border-border last:border-0">
              <td className="py-2 px-2 text-foreground">{row.userName}</td>
              <td className="py-2 px-2 text-right text-foreground">{row.calls}</td>
              <td className="py-2 px-2 text-right text-foreground">{row.emails}</td>
              <td className="py-2 px-2 text-right text-foreground">{row.meetings}</td>
              <td className="py-2 px-2 text-right text-foreground">{row.tasks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderResults = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {error.message || 'Failed to load report data.'}
        </div>
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) {
      return (
        <EmptyState
          title="No data found"
          description="Adjust your filters or select a different report to view results."
        />
      );
    }

    if (reportType === 'sales') {
      return renderSalesReport(data as SalesReportResponse);
    }
    if (reportType === 'pipeline') {
      return renderPipelineReport(data as PipelineReportResponse[]);
    }
    if (reportType === 'leads') {
      return renderLeadsReport(data as LeadConversionReportResponse[]);
    }
    if (reportType === 'activity') {
      return renderActivityReport(data as ActivityReportResponse[]);
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Analyze sales, leads, and activity metrics.</p>
        </div>
        {reportType === 'sales' && (
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={isLoading || !data}>
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Filters</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Report"
            value={reportType}
            onValueChange={(value) => setReportType(value as ReportType)}
            options={[
              { value: 'sales', label: 'Sales Performance' },
              { value: 'pipeline', label: 'Pipeline Overview' },
              { value: 'leads', label: 'Lead Conversion' },
              { value: 'activity', label: 'Activity Report' },
            ]}
          />
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Input
            label="Owner ID"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            placeholder="Optional"
          />
          {reportType === 'sales' && (
            <Input
              label="Pipeline ID"
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
              placeholder="Optional"
            />
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded p-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {reportType === 'sales' && 'Sales Performance'}
          {reportType === 'pipeline' && 'Pipeline Overview'}
          {reportType === 'leads' && 'Lead Conversion'}
          {reportType === 'activity' && 'Activity Report'}
        </h2>
        {renderResults()}
      </div>
    </div>
  );
}
