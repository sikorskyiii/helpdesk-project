import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">HelpDesk</h1>
          <p className="text-muted-foreground mt-2">Create your account</p>
        </div>
        <div className="bg-card border rounded-xl shadow-sm p-8">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
