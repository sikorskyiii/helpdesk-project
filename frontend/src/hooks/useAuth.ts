'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi, LoginPayload, RegisterPayload } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const { setUser, setAccessToken } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
    onSuccess: (res) => {
      setAccessToken(res.accessToken);
      setUser(res.user);
      qc.invalidateQueries({ queryKey: ['auth'] });
      router.push('/dashboard');
      toast.success('Welcome back!');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Invalid credentials');
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    onSuccess: () => {
      toast.success('Registration successful! Please check your email.');
      router.push('/login');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Registration failed');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      qc.clear();
      router.push('/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => {
      toast.success('If an account exists, a reset link has been sent.');
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.');
    },
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password reset successfully!');
      router.push('/login');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Invalid or expired reset token');
    },
  });
}
