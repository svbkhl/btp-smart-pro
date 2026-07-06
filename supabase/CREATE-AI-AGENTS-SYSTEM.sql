-- Fix bug page relances : colonnes manquantes
alter table public.invoices add column if not exists payment_status text default 'pending';
update public.invoices set payment_status='paid' where status='paid' and payment_status is distinct from 'paid';
alter table public.reminder_templates add column if not exists send_after_days integer;
update public.reminder_templates set send_after_days = case reminder_level when 1 then 7 when 2 then 15 else 30 end where send_after_days is null;
alter table public.quote_reminder_templates add column if not exists send_after_days integer;
update public.quote_reminder_templates set send_after_days = case reminder_level when 1 then 3 when 2 then 7 else 14 end where send_after_days is null;

-- Système Agents IA
create table if not exists public.ai_agent_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  agent_type text not null,
  enabled boolean not null default false,
  schedule_time text not null default '08:00',
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, agent_type)
);
alter table public.ai_agent_configs enable row level security;
drop policy if exists select_own_company_ai_agent_configs on public.ai_agent_configs;
create policy select_own_company_ai_agent_configs on public.ai_agent_configs for select using (company_id in (select get_my_company_ids()));
drop policy if exists insert_own_company_ai_agent_configs on public.ai_agent_configs;
create policy insert_own_company_ai_agent_configs on public.ai_agent_configs for insert with check (company_id in (select get_my_company_ids()));
drop policy if exists update_own_company_ai_agent_configs on public.ai_agent_configs;
create policy update_own_company_ai_agent_configs on public.ai_agent_configs for update using (company_id in (select get_my_company_ids()));
drop policy if exists delete_own_company_ai_agent_configs on public.ai_agent_configs;
create policy delete_own_company_ai_agent_configs on public.ai_agent_configs for delete using (company_id in (select get_my_company_ids()));

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  agent_type text not null,
  status text not null default 'success',
  triggered_by text not null default 'cron',
  actions_count integer not null default 0,
  summary text,
  details jsonb not null default '{}'::jsonb,
  ran_at timestamptz not null default now()
);
alter table public.ai_agent_runs enable row level security;
drop policy if exists select_own_company_ai_agent_runs on public.ai_agent_runs;
create policy select_own_company_ai_agent_runs on public.ai_agent_runs for select using (company_id in (select get_my_company_ids()));
create index if not exists idx_ai_agent_runs_lookup on public.ai_agent_runs (company_id, agent_type, ran_at desc);
