import { useEffect, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { AuthContext, type AuthContextValue } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    if (!supabase) return { error: 'Supabase no está configurado.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ configured: isSupabaseConfigured, loading, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
