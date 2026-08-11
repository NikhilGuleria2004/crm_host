import { useState } from 'react';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Modal } from '@crm/ui';
import { ConfirmDialog } from '@crm/ui';
import { Checkbox } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { Badge } from '@crm/ui';
import { useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook, useWebhookDeliveries } from '../hooks/useSettings';
import type { WebhookResponse, WebhookCreateResponse } from '../api/settings';
import { Plus, Trash2, Copy, Eye, RefreshCw, ExternalLink } from 'lucide-react';

const WEBHOOK_EVENTS = [
  { value: 'contact.created', label: 'Contact Created' },
  { value: 'contact.updated', label: 'Contact Updated' },
  { value: 'contact.deleted', label: 'Contact Deleted' },
  { value: 'company.created', label: 'Company Created' },
  { value: 'company.updated', label: 'Company Updated' },
  { value: 'company.deleted', label: 'Company Deleted' },
  { value: 'lead.created', label: 'Lead Created' },
  { value: 'lead.updated', label: 'Lead Updated' },
  { value: 'lead.converted', label: 'Lead Converted' },
  { value: 'deal.created', label: 'Deal Created' },
  { value: 'deal.updated', label: 'Deal Updated' },
  { value: 'deal.stage_changed', label: 'Deal Stage Changed' },
  { value: 'deal.won', label: 'Deal Won' },
  { value: 'deal.lost', label: 'Deal Lost' },
  { value: 'task.created', label: 'Task Created' },
  { value: 'task.completed', label: 'Task Completed' },
  { value: 'note.created', label: 'Note Created' },
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.deactivated', label: 'User Deactivated' },
];

function formatDate(date?: string) {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: 'active' | 'inactive') {
  const variant = status === 'active' ? 'success' : 'default';
  return <Badge variant={variant}>{status}</Badge>;
}

export function SettingsWebhooks() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<WebhookCreateResponse | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deliveriesOpen, setDeliveriesOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookResponse | null>(null);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const webhooksQuery = useWebhooks({ limit: 25, cursor });
  const createMutation = useCreateWebhook();
  const updateMutation = useUpdateWebhook();
  const deleteMutation = useDeleteWebhook();
  const deliveriesQuery = useWebhookDeliveries(selectedWebhook?.id || '', { limit: 50 });

  const webhooks = webhooksQuery.data?.data || [];
  const hasMore = webhooksQuery.data?.meta?.hasMore || false;
  const page = cursor ? 2 : 1;
  const totalPages = hasMore ? page + 1 : page;

  const openCreate = () => {
    setUrl('');
    setSelectedEvents([]);
    setStatus('active');
    setCreateOpen(true);
  };

  const openEdit = (webhook: WebhookResponse) => {
    setSelectedWebhook(webhook);
    setUrl(webhook.url);
    setSelectedEvents(webhook.events);
    setStatus(webhook.status);
    setEditOpen(true);
  };

  const handleCreate = async () => {
    const result = await createMutation.mutateAsync({ url, events: selectedEvents, status });
    setCreatedWebhook(result.data);
    setShowSecret(true);
    setCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!selectedWebhook) return;
    await updateMutation.mutateAsync({ id: selectedWebhook.id, body: { url, events: selectedEvents, status } });
    setEditOpen(false);
    setSelectedWebhook(null);
  };

  const openDelete = (webhook: WebhookResponse) => {
    setSelectedWebhook(webhook);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedWebhook) return;
    await deleteMutation.mutateAsync(selectedWebhook.id);
    setDeleteOpen(false);
    setSelectedWebhook(null);
  };

  const openDeliveries = async (webhook: WebhookResponse) => {
    setSelectedWebhook(webhook);
    setDeliveriesOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > page) {
      setCursor(webhooksQuery.data?.meta?.nextCursor || undefined);
    } else {
      setCursor(undefined);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const columns: Column<WebhookResponse>[] = [
    {
      key: 'url',
      header: 'Endpoint',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate max-w-xs">{row.url}</span>
          <a href={row.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
            <ExternalLink size={14} />
          </a>
        </div>
      ),
    },
    {
      key: 'events',
      header: 'Events',
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.events.length} event{row.events.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDeliveries(row)}>
            <RefreshCw size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openDelete(row)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  if (webhooksQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (webhooksQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {webhooksQuery.error.message || 'Failed to load webhooks.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Webhooks</h1>
          <p className="text-muted-foreground mt-1">Manage webhook endpoints and event subscriptions.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Create Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <EmptyState
          title="No webhooks"
          description="Create a webhook to receive real-time event notifications."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              Create Webhook
            </Button>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded">
          <DataTable columns={columns} data={webhooks} rowKey={(row) => row.id} pagination={{ currentPage: page, totalPages, onPageChange: handlePageChange }} />
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Webhook" footer={
        <>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending || !url || selectedEvents.length === 0}>Create Webhook</Button>
        </>
      }>
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
          <Input
            label="Endpoint URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            required
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Events</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded p-3">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedEvents.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                  />
                  <span>{event.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => { setEditOpen(false); setSelectedWebhook(null); }} title="Edit Webhook" footer={
        <>
          <Button variant="secondary" onClick={() => { setEditOpen(false); setSelectedWebhook(null); }}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={updateMutation.isPending || !url || selectedEvents.length === 0}>Save Changes</Button>
        </>
      }>
        <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-4">
          <Input
            label="Endpoint URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            required
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Events</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded p-3">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedEvents.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                  />
                  <span>{event.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </Modal>

      <Modal open={showSecret} onClose={() => { setShowSecret(false); setCreatedWebhook(null); }} title="Webhook Created" footer={
        <>
          <Button variant="secondary" onClick={() => { setShowSecret(false); setCreatedWebhook(null); }}>Close</Button>
          <Button onClick={() => createdWebhook && copyToClipboard(createdWebhook.secret)}>
            <Copy size={16} className="mr-2" />
            Copy Secret
          </Button>
        </>
      }>
        {createdWebhook && (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/20 rounded p-4">
              <p className="text-sm text-warning font-medium">Make sure to copy your signing secret now.</p>
              <p className="text-xs text-muted-foreground mt-1">You won't be able to see it again after closing this dialog.</p>
            </div>
            <div className="bg-muted/50 border border-border rounded p-3 font-mono text-sm break-all">
              {createdWebhook.secret}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={deliveriesOpen} onClose={() => { setDeliveriesOpen(false); setSelectedWebhook(null); }} title={`Deliveries - ${selectedWebhook?.url}`} footer={
        <Button variant="secondary" onClick={() => { setDeliveriesOpen(false); setSelectedWebhook(null); }}>Close</Button>
      }>
        {deliveriesQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : deliveriesQuery.error ? (
          <div className="text-sm text-danger">Failed to load deliveries.</div>
        ) : deliveriesQuery.data?.data?.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No deliveries yet.</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {deliveriesQuery.data?.data?.map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between border border-border rounded p-3">
                <div className="flex items-center gap-3">
                  <Badge variant={delivery.status === 'delivered' ? 'success' : delivery.status === 'failed' ? 'danger' : 'default'}>
                    {delivery.status}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium text-foreground">{delivery.eventType}</div>
                    <div className="text-xs text-muted-foreground">
                      Attempt {delivery.attempt} &middot; {delivery.responseCode && `HTTP ${delivery.responseCode}`} &middot; {delivery.duration && `${delivery.duration}ms`}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(delivery.createdAt)}</span>
              </div>
            ))}
            {deliveriesQuery.data?.data?.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">No deliveries yet.</div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedWebhook(null); }}
        onConfirm={handleDelete}
        title="Delete webhook?"
        description={`This will permanently delete the webhook "${selectedWebhook?.url}". Any integrations using this endpoint will stop receiving events.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
