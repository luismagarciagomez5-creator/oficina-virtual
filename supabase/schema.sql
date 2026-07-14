-- Fase 0 (Fundación) — ejecutar en el SQL Editor de tu proyecto Supabase.
-- Solo cubre lo necesario para persistir el motor de agentes (workflow_runs +
-- trace_events). Las tablas de Tareas, Rutinas, Informes, Archivos, Skills y
-- Funciones se añaden en sus propias fases, en scripts separados.
--
-- Este es un único workspace interno (no multi-tenant): la política RLS es
-- simplemente "cualquier usuario autenticado puede leer/escribir todo".

create extension if not exists "pgcrypto";

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  stage text not null,
  artifacts jsonb not null default '{}'::jsonb,
  pending_approval jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trace_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(id) on delete cascade,
  agent_id text not null,
  prompt_version text not null,
  input jsonb,
  output jsonb,
  elapsed_ms integer not null,
  result text not null check (result in ('ok', 'error')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists trace_events_run_id_idx on trace_events (run_id);

alter table workflow_runs enable row level security;
alter table trace_events enable row level security;

create policy "authenticated read/write workflow_runs"
  on workflow_runs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "authenticated read/write trace_events"
  on trace_events for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
