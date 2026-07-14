import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import ConfigPendingScreen from './ConfigPendingScreen';
import LoginScreen from './LoginScreen';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, user } = useAuth();

  if (!configured) return <ConfigPendingScreen />;
  if (loading) {
    return (
      <div className="h-screen w-full bg-[#08070a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
      </div>
    );
  }
  if (!user) return <LoginScreen />;

  return <>{children}</>;
}
