export type ViewId =
  | 'panel'
  | 'agentes'
  | 'oficina'
  | 'actividad'
  | 'memoria'
  | 'archivos'
  | 'rutinas'
  | 'buscar'
  | 'analiticas'
  | 'informes'
  | 'skills';

type NavItem = { id: ViewId; label: string; icon: (props: { className?: string }) => React.JSX.Element };

function Icon(paths: string[], extra?: React.JSX.Element) {
  return ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {extra}
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { id: 'panel', label: 'Panel', icon: Icon(['M4 4h7v7H4z', 'M13 4h7v4h-7z', 'M13 10h7v10h-7z', 'M4 13h7v7H4z']) },
  { id: 'agentes', label: 'Agentes', icon: Icon(['M17 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-3A3.5 3.5 0 0 0 7 18.5V20', 'M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M20 20v-1.2a2.8 2.8 0 0 0-2-2.68', 'M15.5 4.2a3 3 0 0 1 0 5.6']) },
  { id: 'oficina', label: 'Oficina', icon: Icon(['M4 21V7l8-4 8 4v14', 'M9 21v-6h6v6', 'M9 11h.01', 'M15 11h.01', 'M9 15h.01', 'M15 15h.01']) },
  { id: 'actividad', label: 'Actividad', icon: Icon(['M3 12h4l2 7 4-14 2 7h6']) },
  { id: 'memoria', label: 'Memoria', icon: Icon(['M9 3a3 3 0 0 0-3 3v.2A3 3 0 0 0 4 9v1a3 3 0 0 0 1 2.2V14a3 3 0 0 0 3 3', 'M15 3a3 3 0 0 1 3 3v.2A3 3 0 0 1 20 9v1a3 3 0 0 1-1 2.2V14a3 3 0 0 1-3 3', 'M9 3v18', 'M15 3v18']) },
  { id: 'archivos', label: 'Archivos', icon: Icon(['M3 7h6l2 2h10v10H3z']) },
  { id: 'rutinas', label: 'Rutinas', icon: Icon(['M3 11a9 9 0 0 1 15.5-6.3', 'M21 3v6h-6', 'M21 13a9 9 0 0 1-15.5 6.3', 'M3 21v-6h6']) },
  { id: 'buscar', label: 'Buscar', icon: Icon(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.3-4.3']) },
  { id: 'analiticas', label: 'Analíticas', icon: Icon(['M4 20V10', 'M12 20V4', 'M20 20v-7']) },
  { id: 'informes', label: 'Informes', icon: Icon(['M6 3h9l3 3v15H6z', 'M9 12h6', 'M9 16h6', 'M9 8h3']) },
  { id: 'skills', label: 'Skills', icon: Icon(['M12 2l2.6 5.9L21 8.8l-4.7 4.2L17.6 20 12 16.6 6.4 20l1.3-7-4.7-4.2 6.4-.9z']) },
];

type Props = {
  active: ViewId;
  onSelect: (id: ViewId) => void;
  userEmail: string | null;
  onSignOut: () => void;
};

export default function Sidebar({ active, onSelect, userEmail, onSignOut }: Props) {
  return (
    <aside className="onyx-sidebar hidden md:flex w-[244px] shrink-0 flex-col z-20">
      <div className="onyx-brand px-4 py-4">
        <div className="onyx-wordmark" aria-label="ONYXLINK">
          <img src="/onyxlink-brand.jpg" alt="ONYXLINK" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Centro de control</div>
      <nav className="flex-1 overflow-y-auto py-1.5 px-2.5 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          const ItemIcon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`onyx-nav-item relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-all ${
                isActive
                  ? 'is-active text-white font-medium'
                  : 'text-white/48 hover:text-white/85 hover:bg-white/[0.035]'
              }`}
            >
              <ItemIcon className={`w-[17px] h-[17px] shrink-0 ${isActive ? 'text-violet-300' : ''}`} />
              <span className="truncate">{item.label}</span>
              {isActive && <span className="ml-auto w-1 h-1 rounded-full bg-violet-300 shadow-[0_0_8px_#a78bfa]" />}
            </button>
          );
        })}
      </nav>

      <div className="onyx-identity flex items-center gap-3 mx-3 mb-3 px-3 py-3">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#0d0a12] border border-violet-400/60 flex items-center justify-center text-[10px] font-bold text-white shadow-[inset_0_0_12px_rgba(124,58,237,.2)]">
            {(userEmail ?? 'ON').slice(0, 2).toUpperCase()}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#09080b] shadow-[0_0_7px_rgba(52,211,153,.75)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-white truncate">{userEmail ?? 'Oficina ONYXLINK'}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-400 truncate">
            <span className="w-1 h-1 rounded-full bg-emerald-400" /> En línea
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="shrink-0 text-white/35 hover:text-white/80 transition-colors p-1.5 rounded-md hover:bg-white/[0.06]"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
