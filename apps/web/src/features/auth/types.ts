import type { GlobalRole } from '@/types/auth';

export type { GlobalRole };

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: GlobalRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}
