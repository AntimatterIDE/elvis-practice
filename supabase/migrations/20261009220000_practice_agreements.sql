-- Practice agreements and the signed copies patients return.
-- Staff reach these tables through the app. The public signing page uses the service role.
-- A signed copy keeps its own title and text, so later edits to the agreement do not rewrite it.

create table public.practice_agreements (
  id text primary key,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agreement_packets (
  id text primary key,
  agreement_id text references public.practice_agreements (id) on delete set null,
  token text not null unique,
  patient_id text,
  recipient_name text not null,
  recipient_email text not null,
  title text not null,
  body text not null,
  status text not null check (status in ('sent', 'signed', 'void')),
  expires_at timestamptz not null,
  sent_at timestamptz not null default now(),
  signed_at timestamptz,
  signer_name text,
  signature_png text,
  signer_ip text,
  sent_by text,
  created_at timestamptz not null default now()
);

create index agreement_packets_patient_idx on public.agreement_packets (patient_id, sent_at desc);
create index agreement_packets_email_idx on public.agreement_packets (lower(recipient_email));

alter table public.practice_agreements enable row level security;
alter table public.agreement_packets enable row level security;

revoke all on table public.practice_agreements from public, anon;
revoke all on table public.agreement_packets from public, anon;

grant select, insert, update, delete on table
  public.practice_agreements,
  public.agreement_packets
to authenticated;

create policy practice_agreements_staff on public.practice_agreements
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy agreement_packets_staff on public.agreement_packets
for all to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));
