-- Practice claims shared across staff browsers (draft / ready / submitted).
-- One practice: every staff role can read and write the full claims desk.

create table if not exists public.claims (
  id text primary key,
  patient_id text not null default '',
  status text not null default 'draft',
  claim jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists claims_status_updated_idx on public.claims (status, updated_at desc);
create index if not exists claims_patient_idx on public.claims (patient_id);

alter table public.claims enable row level security;

revoke all on table public.claims from public, anon;

grant select, insert, update, delete on table public.claims to authenticated;
grant select, insert, update, delete on table public.claims to service_role;

create policy claims_staff_read on public.claims
for select to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy claims_staff_insert on public.claims
for insert to authenticated
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy claims_staff_update on public.claims
for update to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy claims_staff_delete on public.claims
for delete to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'));
