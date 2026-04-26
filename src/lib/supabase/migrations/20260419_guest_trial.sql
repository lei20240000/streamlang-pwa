create extension if not exists pgcrypto;

alter table public.users
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

update public.users
set plan_type = 'free'
where plan_type is null;

create table if not exists public.guest_usage_logs (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  ip_hash text,
  user_agent_hash text,
  action_type text not null,
  source_text_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_guest_usage_logs_guest_id
  on public.guest_usage_logs (guest_id);

create index if not exists idx_guest_usage_logs_action_type
  on public.guest_usage_logs (action_type);

create index if not exists idx_guest_usage_logs_created_at
  on public.guest_usage_logs (created_at desc);

create index if not exists idx_guest_usage_logs_ip_ua
  on public.guest_usage_logs (ip_hash, user_agent_hash);

comment on column public.users.trial_started_at is '7-day trial start time';
comment on column public.users.trial_ends_at is '7-day trial end time';
comment on table public.guest_usage_logs is 'guest trial usage logs for anti-abuse and token cost control';