-- Shared practice desk settings (profile, tasks, eligibility history).
-- One practice: every staff role can read and write the same profile.

create table if not exists public.practice_desk (
  id text primary key,
  practice jsonb not null default '{}'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  eligibility jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.practice_desk enable row level security;

revoke all on table public.practice_desk from public, anon;

grant select, insert, update, delete on table public.practice_desk to authenticated;
grant select, insert, update, delete on table public.practice_desk to service_role;

create policy practice_desk_staff_read on public.practice_desk
for select to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy practice_desk_staff_insert on public.practice_desk
for insert to authenticated
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy practice_desk_staff_update on public.practice_desk
for update to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy practice_desk_staff_delete on public.practice_desk
for delete to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'));

-- Compliance checklist / BAA draft scratchpad shared across staff.

create table if not exists public.compliance_desk (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.compliance_desk enable row level security;

revoke all on table public.compliance_desk from public, anon;

grant select, insert, update, delete on table public.compliance_desk to authenticated;
grant select, insert, update, delete on table public.compliance_desk to service_role;

create policy compliance_desk_staff_read on public.compliance_desk
for select to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy compliance_desk_staff_insert on public.compliance_desk
for insert to authenticated
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy compliance_desk_staff_update on public.compliance_desk
for update to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy compliance_desk_staff_delete on public.compliance_desk
for delete to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'));
