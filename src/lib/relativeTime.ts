// Shared by ActividadView and PanelView so "hace X" reads consistently across views.
export function relativeTime(occurredAt: string, now: number): string {
  const deltaMs = now - Date.parse(occurredAt);
  const seconds = Math.max(0, Math.round(deltaMs / 1000));
  if (seconds < 5) return 'ahora mismo';
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `hace ${hours} h`;
}
