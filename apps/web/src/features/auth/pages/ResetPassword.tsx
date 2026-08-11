import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Toast } from '@crm/ui';
import { authApi } from '../api/auth';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    try {
      setServerError(null);
      await authApi.resetPassword({ token, password: data.password });
      setToast({ message: 'Password reset successfully', type: 'success' });
      setTimeout(() => {
        navigate('/login');
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      setServerError(message);
      setToast({ message: 'Failed to reset password', type: 'error' });
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
            <h2 className="text-xl font-semibold text-foreground text-center mb-4">Invalid or expired link</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              This password reset link is invalid or has expired.
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

          <h2 className="text-xl font-semibold text-foreground text-center mb-6">Reset Password</h2>

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

          <div className="mb-4 text-xs text-muted-foreground">
            Password must be at least 8 characters long.
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Input
                label="New password"
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

            <div>
              <Input
                label="Confirm password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
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
