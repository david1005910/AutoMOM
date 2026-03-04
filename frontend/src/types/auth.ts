export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'pro';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}
