-- Recorded visits: one row holds the audio pointer, transcript, note, and codes.
-- Audio bytes live in the private visit-audio bucket, created by the server when a visit is stored.

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid not null references public.profiles (id),
  patient_label text not null default '' check (char_length(patient_label) <= 120),
  status text not null default 'uploaded' check (
    status in (
      'uploaded',
      'transcribing',
      'generating',
      'generating_icd10',
      'generating_cpt',
      'review',
      'error'
    )
  ),
  audio_path text,
  audio_content_type text not null default '',
  transcript text not null default '',
  medical_practice text not null default '',
  note_clinical text not null default '',
  icd10 jsonb not null default '[]'::jsonb,
  billing_codes jsonb not null default '[]'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index encounters_created_idx on public.encounters (created_at desc);
create index encounters_clinician_idx on public.encounters (clinician_id);

alter table public.encounters enable row level security;

revoke all on table public.encounters from public, anon;

grant select, insert, update on table public.encounters to authenticated;

create policy encounters_staff_read on public.encounters
for select to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'));

create policy encounters_staff_insert on public.encounters
for insert to authenticated
with check (
  public.current_profile_role() in ('owner', 'admin', 'editor')
  and clinician_id = auth.uid()
);

create policy encounters_staff_update on public.encounters
for update to authenticated
using (public.current_profile_role() in ('owner', 'admin', 'editor'))
with check (public.current_profile_role() in ('owner', 'admin', 'editor'));
