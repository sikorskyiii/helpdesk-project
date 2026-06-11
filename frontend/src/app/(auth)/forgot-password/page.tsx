import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot Password' };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">HelpDesk</h1>
          <p className="text-muted-foreground mt-2">Reset your password</p>
        </div>
        <div className="bg-card border rounded-xl shadow-sm p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
