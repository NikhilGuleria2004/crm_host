import { useState } from 'react';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { ConfirmDialog } from '@crm/ui';
import { useChangePassword, useSessions, useRevokeAllSessions } from '../hooks/useSettings';
import { Lock, Smartphone, Monitor } from 'lucide-react';

export function SettingsSecurity() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showMfaStub, setShowMfaStub] = useState(false);
  const [showRevokeAll, setShowRevokeAll] = useState(false);

  const changePasswordMutation = useChangePassword();
  const sessionsQuery = useSessions();
  const revokeAllMutation = useRevokeAllSessions();

  const sessions = sessionsQuery.data?.data || [];
  const activeSessions = sessions.filter((s) => !s.expiresAt || new Date(s.expiresAt) > new Date());

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return;
    await changePasswordMutation.mutateAsync({
      currentPassword,
      newPassword,
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Security</h1>
        <p className="text-muted-foreground mt-1">Manage your password, sessions, and authentication settings.</p>
      </div>

      <div className="bg-card border border-border rounded space-y-6">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground">Password</h2>
              <p className="text-sm text-muted-foreground">Last changed: Never</p>
            </div>
          </div>
          <div className="space-y-4 max-w-md">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
            >
              {changePasswordMutation.isPending ? 'Updating...' : 'Change password'}
            </Button>
          </div>
        </div>

        <div className="border-t border-border" />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground">Two-factor authentication</h2>
              <p className="text-sm text-muted-foreground">Not enabled</p>
            </div>
          </div>
          {!showMfaStub ? (
            <Button variant="secondary" onClick={() => setShowMfaStub(true)}>Enable</Button>
          ) : (
            <div className="bg-muted/50 border border-border rounded p-4">
              <p className="text-sm text-foreground">MFA setup is not yet available in this version.</p>
              <p className="text-sm text-muted-foreground mt-1">This feature will be added in a future update.</p>
              <Button variant="secondary" className="mt-3" onClick={() => setShowMfaStub(false)}>Dismiss</Button>
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground">Active sessions</h2>
                <p className="text-sm text-muted-foreground">{activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {activeSessions.length > 1 && (
              <Button variant="secondary" onClick={() => setShowRevokeAll(true)}>
                Sign out other sessions
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between bg-muted/30 rounded p-3">
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {getUserAgentString(session.userAgent)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getPlatform(session.userAgent)} · Last active {formatDate(session.lastUsedAt)}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {}}>
                  Sign out
                </Button>
              </div>
            ))}
          </div>
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