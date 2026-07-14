import { useState, type FormEvent } from 'react';
import { useAuth } from './useAuth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setError(error);
  };

  return (
    <div className="h-screen w-full bg-[#08070a] flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-[#0e0c11] border border-violet-500/20 rounded-2xl p-7 shadow-[0_0_40px_rgba(124,58,237,.08)]"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-md bg-[#151219] border border-violet-500/70 shadow-[0_0_16px_rgba(124,58,237,.32)] flex items-center justify-center text-violet-300 font-bold text-lg mb-3">
            O
          </div>
          <div className="text-slate-100 font-semibold tracking-wide">ONYXLINK</div>
          <div className="text-[11px] text-violet-300/55">Oficina de agentes · acceso del equipo</div>
        </div>

        <label className="block text-xs text-slate-400 mb-1.5">Email</label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@onyxlink.ai"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-400 mb-4"
        />

        <label className="block text-xs text-slate-400 mb-1.5">Contraseña</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-400 mb-2"
        />

        {error && <div className="text-xs text-rose-400 mb-3">{error}</div>}

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="w-full mt-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors shadow-[0_0_16px_rgba(124,58,237,.25)]"
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-[11px] text-slate-500 text-center mt-4">
          Solo cuentas invitadas por el equipo. Si no tienes acceso, pide una invitación.
        </p>
      </form>
    </div>
  );
}
