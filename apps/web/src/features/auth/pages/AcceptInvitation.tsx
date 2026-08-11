import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Toast } from '@crm/ui';
import { authApi } from '../api/auth';

const acceptInvitationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

export function AcceptInvitation() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
  });

  const onSubmit = async () => {
    if (!token) {
      setServerError('Invitation token is missing.');
      return;
    }

    try {
      setServerError(null);
      await authApi.acceptInvitation(token);
      setToast({ message: 'Invitation accepted successfully', type: 'success' });
      setTimeout(() => {
        navigate('/login?invitation=accepted');
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept invitation';
      setServerError(message);
      setToast({ message: 'Failed to accept invitation', type: 'error' });
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-primary">CRM</h1>
            </div>
            <h2 className="text-xl font-semibold text-foreground text-center mb-4">Invalid invitation</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              The invitation link is invalid or has expired.
            </p>
            <div className="text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-primary">CRM</h1>
          </div>

          <h2 className="text-xl font-semibold text-foreground text-center mb-2">
            You've been invited to join
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Set up your account.
          </p>

          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          {serverError && (
            <div className="mb-4 bg-danger/10 border border-danger/20 rounded p-3 text-sm text-danger">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Input
                label="First name"
                placeholder="John"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
            </div>

            <div>
              <Input
                label="Last name"
                placeholder="Doe"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <div>
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                disabled
              />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
