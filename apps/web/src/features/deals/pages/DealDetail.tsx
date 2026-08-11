import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, ArrowRightLeft, Trophy, XCircle } from 'lucide-react';
import { Button } from '@crm/ui';
import { useDeal, useDeleteDeal, useChangeDealStage, useMarkDealWon, useMarkDealLost } from '../hooks/useDeals';
import { usePermissions } from '../../auth/hooks/usePermissions';
import { useState } from 'react';

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useDeal(id || '');
  const deleteMutation = useDeleteDeal();
  const changeStageMutation = useChangeDealStage();
  const markWonMutation = useMarkDealWon();
  const markLostMutation = useMarkDealLost();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const { hasPermission } = usePermissions();
  const [showLostReason, setShowLostReason] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');

  if (!id) {
    return <div className="text-danger">Deal ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Deal not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/deals">
            <Button variant="secondary">Back to Deals</Button>
          </Link>
        </div>
      </div>
    );
  }

  const deal = data.data;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    window.location.href = '/app/deals';
  };

  const handleStageChange = async () => {
    if (!selectedStageId) return;
    await changeStageMutation.mutateAsync({ id, stageId: selectedStageId });
    setShowStageSelect(false);
    setSelectedStageId('');
  };

  const handleMarkWon = async () => {
    await markWonMutation.mutateAsync({ id });
  };

  const handleMarkLost = async () => {
    if (!lostReason.trim()) return;
    await markLostMutation.mutateAsync({ id, reason: lostReason });
    setShowLostReason(false);
    setLostReason('');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Link to="/app/deals">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{deal.name}</h1>
            <p className="text-muted-foreground mt-1">
              {deal.pipeline?.name} · {deal.stage?.name}
              {deal.status === 'won' && ' · Won'}
              {deal.status === 'lost' && ' · Lost'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deal.status === 'open' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowStageSelect(true)}>
                <ArrowRightLeft size={16} className="mr-2" />
                Change Stage
              </Button>
              <Button variant="secondary" size="sm" onClick={handleMarkWon} disabled={markWonMutation.isPending}>
                <Trophy size={16} className="mr-2" />
                Mark Won
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowLostReason(true)}>
                <XCircle size={16} className="mr-2" />
                Mark Lost
              </Button>
            </>
          )}
          {hasPermission('deals.update') && (
            <Link to={`/app/deals/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {hasPermission('deals.delete') && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Deal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Name</span>
              <p className="text-sm text-foreground font-medium">{deal.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Amount</span>
              <p className="text-sm text-foreground font-medium">{formatCurrency(deal.amount, deal.currency)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Probability</span>
              <p className="text-sm text-foreground font-medium">{deal.probability}%</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Expected Close</span>
              <p className="text-sm text-foreground font-medium">{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Pipeline</span>
              <p className="text-sm text-foreground font-medium">{deal.pipeline?.name || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Stage</span>
              <p className="text-sm text-foreground font-medium">{deal.stage?.name || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Company</span>
              <p className="text-sm text-foreground font-medium">{deal.company?.name || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Contact</span>
              <p className="text-sm text-foreground font-medium">{deal.contact?.name || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Owner</span>
              <p className="text-sm text-foreground font-medium">{deal.owner?.name || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <p className="text-sm text-foreground font-medium">{deal.status}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded">
              <div className="text-2xl font-semibold text-foreground">{deal.summary.activities}</div>
              <div className="text-xs text-muted-foreground">Activities</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded">
              <div className="text-2xl font-semibold text-foreground">{deal.summary.tasks}</div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded">
              <div className="text-2xl font-semibold text-foreground">{deal.summary.notes}</div>
              <div className="text-xs text-muted-foreground">Notes</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded">
              <div className="text-2xl font-semibold text-foreground">{deal.summary.attachments}</div>
              <div className="text-xs text-muted-foreground">Attachments</div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Delete Deal?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove this deal permanently.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Deal'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showStageSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowStageSelect(false)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Change Stage</h2>
              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-1">New Stage</label>
                <select
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select stage</option>
                  {deal.stage && (
                    <option value={deal.stage.id}>{deal.stage.name}</option>
                  )}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowStageSelect(false)}>
                Cancel
              </Button>
              <Button onClick={handleStageChange} disabled={!selectedStageId || changeStageMutation.isPending}>
                {changeStageMutation.isPending ? 'Saving...' : 'Change Stage'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showLostReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLostReason(false)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Mark Deal as Lost</h2>
              <p className="mt-2 text-sm text-muted-foreground">Please provide a reason for losing this deal.</p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
                <textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Budget unavailable, competitor, etc."
                />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowLostReason(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleMarkLost} disabled={!lostReason.trim() || markLostMutation.isPending}>
                {markLostMutation.isPending ? 'Saving...' : 'Mark Lost'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
