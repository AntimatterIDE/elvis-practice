-- Server-only config (OCR sidecar URL/key). No anon/authenticated access.
create table if not exists public.service_config (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.service_config enable row level security;

revoke all on table public.service_config from public, anon, authenticated;
grant select, insert, update, delete on table public.service_config to service_role;
