export default function ConfigPendingScreen() {
  return (
    <div className="h-screen w-full bg-[#08070a] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0e0c11] border border-amber-500/25 rounded-2xl p-7">
        <div className="text-amber-300 font-semibold mb-2">Falta configurar Supabase</div>
        <p className="text-sm text-slate-400 leading-relaxed mb-3">
          Esta app requiere iniciar sesión, y el login vive en Supabase. Todavía no hay credenciales configuradas.
        </p>
        <ol className="text-sm text-slate-300 list-decimal list-inside space-y-1.5 mb-3">
          <li>Crea un proyecto gratuito en supabase.com.</li>
          <li>
            Ejecuta <code className="text-violet-300 bg-black/40 px-1 rounded">supabase/schema.sql</code> en su SQL Editor.
          </li>
          <li>
            En Authentication → Settings, desactiva <em>"Allow new users to sign up"</em> e invita a tu equipo desde
            Authentication → Users.
          </li>
          <li>
            Copia <code className="text-violet-300 bg-black/40 px-1 rounded">.env.example</code> a{' '}
            <code className="text-violet-300 bg-black/40 px-1 rounded">.env</code> y rellena las dos claves con
            Project Settings → API.
          </li>
          <li>Reinicia <code className="text-violet-300 bg-black/40 px-1 rounded">npm run dev</code>.</li>
        </ol>
        <p className="text-[11px] text-slate-500">Detalle completo en el README y en adapters/README.md.</p>
      </div>
    </div>
  );
}
