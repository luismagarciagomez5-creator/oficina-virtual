import type { User } from '@supabase/supabase-js';
import { createContext } from 'react';

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
