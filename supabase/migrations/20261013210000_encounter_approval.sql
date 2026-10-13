-- A doctor can approve the note and the codes, then send that visit to claims.

alter table public.encounters
  add column if not exists appointment_id text not null default '' check (char_length(appointment_id) <= 80),
  add column if not exists note_approved boolean not null default false;

alter table public.encounters drop constraint if exists encounters_status_check;

alter table public.encounters
  add constraint encounters_status_check check (
    status in (
      'uploaded',
      'transcribing',
      'generating',
      'generating_icd10',
      'generating_cpt',
      'review',
      'approved',
      'error'
    )
  );
