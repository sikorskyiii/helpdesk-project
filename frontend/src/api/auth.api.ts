import { api } from '@/lib/axios';
import type { User } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface TokenResponse {
  accessToken: string;
}

export const authApi = {
  register: (data: RegisterPayload) => api.post('/auth/register', data),

  login: (data: LoginPayload): Promise<LoginResponse> =>
    api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  refresh: (): Promise<TokenResponse> => api.post('/auth/refresh'),

  getMe: (): Promise<User> => api.get('/auth/me'),

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  verifyEmail: (token: string) => api.get(`/auth/verify-email/${token}`),
};
