import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { authApi } from '../api/auth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setSubmitError(null);
      await authApi.forgotPassword(data);
      setIsSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-primary">CRM</h1>
          </div>

          {!isSubmitted ? (
            <>
              <h2 className="text-xl font-semibold text-foreground text-center mb-2">Forgot password?</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Enter your email address and we'll send instructions to reset your password.
              </p>

              {submitError && (
                <div className="mb-4 bg-danger/10 border border-danger/20 rounded p-3 text-sm text-danger">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                  ← Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-4">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                If an account exists for this email, you will receive reset instructions.
              </p>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
