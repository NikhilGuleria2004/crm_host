import { useState } from 'react';
import { Button } from '@crm/ui';
import { ConfirmDialog } from '@crm/ui';
import { useSessions, useRevokeSession, useRevokeAllSessions } from '../hooks/useSettings';
import { Monitor } from 'lucide-react';

export function SettingsSessions() {
  const [showRevokeAll, setShowRevokeAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const sessionsQuery = useSessions();
  const revokeMutation = useRevokeSession();
  const revokeAllMutation = useRevokeAllSessions();

  const sessions = sessionsQuery.data?.data || [];
  const activeSessions = sessions.filter((s) => !s.expiresAt || new Date(s.expiresAt) > new Date());

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    await revokeMutation.mutateAsync(id);
    setRevokingId(null);
  };

  const handleRevokeAll = async () => {
    await revokeAllMutation.mutateAsync();
    setShowRevokeAll(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserAgentString = (userAgent?: string) => {
    if (!userAgent) return 'Unknown device';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown device';
  };

  const getPlatform = (userAgent?: string) => {
    if (!userAgent) return 'Unknown OS';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown OS';
  };

  if (sessionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (sessionsQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {sessionsQuery.error.message || 'Failed to load sessions.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Active Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage your active sessions across devices.</p>
        </div>
        {activeSessions.length > 1 && (
          <Button variant="secondary" onClick={() => setShowRevokeAll(true)}>
            Sign out all other sessions
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded">
        <div className="divide-y divide-border">
          {activeSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {getUserAgentString(session.userAgent)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getPlatform(session.userAgent)} · IP: {session.ipAddress || 'Unknown'} · Last active {formatDate(session.lastUsedAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {formatDate(session.createdAt)} · Expires {formatDate(session.expiresAt)}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(session.id)}
                disabled={revokingId === session.id || revokeMutation.isPending}
              >
                {revokingId === session.id ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          ))}
          {activeSessions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No active sessions found.
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showRevokeAll}
        onClose={() => setShowRevokeAll(false)}
        onConfirm={handleRevokeAll}
        title="Sign out all other sessions?"
        description="This will sign you out of all other devices. You will remain signed in on this device."
        confirmLabel="Sign out all sessions"
        destructive
        loading={revokeAllMutation.isPending}
      />
    </div>
  );
}