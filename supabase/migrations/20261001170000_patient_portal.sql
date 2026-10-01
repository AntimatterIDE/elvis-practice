-- Patient intake forms, submitted charts, and portal logins.
-- Staff reach these tables through the app. Patients do not query them directly.
-- Public intake and portal sign-in run with the service role, which bypasses these policies.

create table public.intake_forms (
  id text primary key,
  title text not null,
  introduction text not null default '',
  fields jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.intake_invites (
  id text primary key,
  token text not null unique,
  recipient_email text not null default '',
  recipient_name text not null default '',
  expires_at timestamptz not null,
  submitted_at timestamptz,
  patient_id text,
  created_at timestamptz not null default now()
);

create table public.portal_patients (
  id text primary key,
  mrn text not null,
  chart jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intake_submissions (
  id text primary key,
  invite_id text not null unique references public.intake_invites (id),
  patient_id text not null references public.portal_patients (id),
  answers jsonb not null,
  fields jsonb not null,
  created_at timestamptz not null default now()
);

create table public.portal_accounts (
  patient_id text primary key references public.portal_patients (id) on delete cascade,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create unique index portal_accounts_email_key on public.portal_accounts (lower(email));

create table public.portal_visits (
  id text primary key,
  patient_id text not null references public.portal_patients (id) on delete cascade,
  appointment jsonb not null,
  start_at text not null
);

create index portal_visits_patient_idx on public.portal_visits (patient_id, start_at);

create table public.portal_sessions (
  token_hash text primary key,
  patient_id text not null references public.portal_patients (id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.intake_forms enable row level security;
alter table public.intake_invites enable row level security;
alter table public.intake_submissions enable row level security;
alter table public.portal_patients enable row level security;
alter table public.portal_accounts enable row level security;
alter table public.portal_visits enable row level security;
alter table public.portal_sessions enable row level security;

revoke all on table public.intake_forms from public, anon;
revoke all on table public.intake_invites from public, anon;
revoke all on table public.intake_submissions from public, anon;
revoke all on table public.portal_patients from public, anon;
revoke all on table public.portal_accounts from public, anon;
revoke all on table public.portal_visits from public, anon;
revoke all on table public.portal_sessions from public, anon;

grant select, insert, update, delete on table
  public.intake_forms,
  public.intake_invites,
  public.intake_submissions,
  public.portal_patients,
  public.portal_accounts,
  public.portal_visits,
  public.portal_sessions
to authenticated;

create policy intake_forms_staff on public.intake_forms
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy intake_invites_staff on public.intake_invites
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy intake_submissions_staff on public.intake_submissions
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy portal_patients_staff on public.portal_patients
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy portal_accounts_staff on public.portal_accounts
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy portal_visits_staff on public.portal_visits
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy portal_sessions_staff on public.portal_sessions
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));
