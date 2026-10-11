-- Consultation requests stay on the desk until the office reaches out.

create table public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null default '' check (char_length(email) <= 120),
  phone text not null default '' check (char_length(phone) <= 40),
  preferred_time text not null default '' check (char_length(preferred_time) <= 120),
  note text not null default '' check (char_length(note) <= 500),
  kind text not null default 'consultation' check (kind in ('consultation', 'general')),
  status text not null default 'new' check (status in ('new', 'reached', 'closed')),
  created_at timestamptz not null default now(),
  constraint consultation_requests_reach check (char_length(email) > 0 or char_length(phone) > 0)
);

alter table public.consultation_requests enable row level security;

grant select, update on public.consultation_requests to authenticated;

create policy consultation_requests_staff_read on public.consultation_requests
for select to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'));

create policy consultation_requests_staff_update on public.consultation_requests
for update to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'))
with check (public.current_profile_role() in ('editor', 'admin', 'owner'));
