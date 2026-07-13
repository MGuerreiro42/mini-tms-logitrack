export type GlobalRole =
  | 'ADMIN'
  | 'SELLER'
  | 'CARRIER_MANAGER'
  | 'CARRIER_OPERATOR';

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
