-- The Alignment Clinic content model.
-- Run against a Supabase project. auth.users and auth.uid() already exist there.
-- Public sign-up must also be disabled in the Auth dashboard.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner', 'admin', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to anon, authenticated;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  role text not null check (role in ('owner', 'admin', 'editor')),
  invited_by uuid references public.profiles (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index invitations_open_email_idx
  on public.invitations (lower(email))
  where accepted_at is null;

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  practice_name text not null default 'The Alignment Clinic',
  physician_name text not null default 'Elvis Francois, MD',
  phone text,
  address text,
  hours text,
  booking_url text,
  emergency_note text not null,
  announcement text,
  updated_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  body text not null default '',
  seo_title text not null,
  seo_description text not null,
  review_status text not null default 'draft' check (review_status in ('draft', 'in_review', 'approved')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint pages_publish_guard check (
    published_at is null or review_status = 'approved'
  )
);

create table public.conditions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  summary text not null,
  sections jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  related_slugs text[] not null default '{}',
  offering_status text not null default 'unconfirmed' check (offering_status in ('unconfirmed', 'offered', 'not_offered')),
  review_status text not null default 'draft' check (review_status in ('draft', 'in_review', 'approved')),
  seo_title text not null,
  seo_description text not null,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint conditions_publish_guard check (
    published_at is null
    or (offering_status = 'offered' and review_status = 'approved')
  )
);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  summary text not null,
  sections jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  related_slugs text[] not null default '{}',
  offering_status text not null default 'unconfirmed' check (offering_status in ('unconfirmed', 'offered', 'not_offered')),
  review_status text not null default 'draft' check (review_status in ('draft', 'in_review', 'approved')),
  seo_title text not null,
  seo_description text not null,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint treatments_publish_guard check (
    published_at is null
    or (offering_status = 'offered' and review_status = 'approved')
  )
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  review_status text not null default 'draft' check (review_status in ('draft', 'in_review', 'approved')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint faqs_publish_guard check (
    published_at is null or review_status = 'approved'
  )
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt text not null,
  credit text,
  rights_status text not null default 'pending' check (rights_status in ('pending', 'approved', 'rejected')),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  entity_table text not null,
  entity_id text not null,
  summary text not null check (char_length(summary) <= 280),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.conditions enable row level security;
alter table public.treatments enable row level security;
alter table public.faqs enable row level security;
alter table public.media_assets enable row level security;
alter table public.audit_log enable row level security;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select on public.site_settings, public.pages, public.conditions, public.treatments, public.faqs, public.media_assets to anon;
grant select, insert, update, delete on public.profiles, public.invitations, public.site_settings, public.pages, public.conditions, public.treatments, public.faqs, public.media_assets, public.audit_log to authenticated;

create policy profiles_self_read on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_profile_role() in ('admin', 'owner'));

create policy profiles_owner_update on public.profiles
for update to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy invitations_owner_all on public.invitations
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy invitations_admin_editor on public.invitations
for insert to authenticated
with check (public.current_profile_role() = 'admin' and role = 'editor');

create policy settings_public_read on public.site_settings
for select to anon, authenticated
using (true);

create policy settings_owner_write on public.site_settings
for update to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy settings_owner_insert on public.site_settings
for insert to authenticated
with check (public.current_profile_role() = 'owner');

create policy pages_public_read on public.pages
for select to anon
using (published_at is not null and review_status = 'approved');

create policy pages_staff_read on public.pages
for select to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'));

create policy pages_staff_insert on public.pages
for insert to authenticated
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (
    public.current_profile_role() = 'editor'
    and published_at is null
    and review_status in ('draft', 'in_review')
  )
);

create policy pages_staff_update on public.pages
for update to authenticated
using (
  public.current_profile_role() in ('admin', 'owner')
  or (public.current_profile_role() = 'editor' and published_at is null and review_status <> 'approved')
)
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (
    public.current_profile_role() = 'editor'
    and published_at is null
    and review_status in ('draft', 'in_review')
  )
);

create policy pages_admin_delete on public.pages
for delete to authenticated
using (public.current_profile_role() in ('admin', 'owner'));

create policy conditions_public_read on public.conditions
for select to anon
using (
  published_at is not null
  and review_status = 'approved'
  and offering_status = 'offered'
);

create policy conditions_staff_read on public.conditions
for select to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'));

create policy conditions_staff_insert on public.conditions
for insert to authenticated
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (
    public.current_profile_role() = 'editor'
    and published_at is null
    and review_status in ('draft', 'in_review')
    and offering_status = 'unconfirmed'
  )
);

create policy conditions_staff_update on public.conditions
for update to authenticated
using (
  public.current_profile_role() in ('admin', 'owner')
  or (public.current_profile_role() = 'editor' and published_at is null and review_status <> 'approved')
)
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (
    public.current_profile_role() = 'editor'
    and published_at is null
    and review_status in ('draft', 'in_review')
    and offering_status = 'unconfirmed'
  )
);

create policy conditions_admin_delete on public.conditions
for delete to authenticated
using (public.current_profile_role() in ('admin', 'owner'));

create policy treatments_public_read on public.treatments
for select to anon
using (
  published_at is not null
  and review_status = 'approved'
  and offering_status = 'offered'
);

create policy treatments_staff_read on public.treatments
for select to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'));

create policy treatments_staff_insert on public.treatments
for insert to authenticated
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (
    public.current_profile_role() = 'editor'
    and published_at is null
    and review_status in ('draft', 'in_review')
    and offering_status = 'unconfirmed'
  )
);

create policy treatments_staff_update on public.treatments
for update to authenticated
using (
  public.current_profile_role() in ('admin', 'owner')
  or (public.current_profile_role() = 'editor' and published_at is null and review_status <> 'approved')
)
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (
    public.current_profile_role() = 'editor'
    and published_at is null
    and review_status in ('draft', 'in_review')
    and offering_status = 'unconfirmed'
  )
);

create policy treatments_admin_delete on public.treatments
for delete to authenticated
using (public.current_profile_role() in ('admin', 'owner'));

create policy faqs_public_read on public.faqs
for select to anon
using (published_at is not null and review_status = 'approved');

create policy faqs_staff_read on public.faqs
for select to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'));

create policy faqs_staff_write on public.faqs
for insert to authenticated
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (public.current_profile_role() = 'editor' and published_at is null and review_status in ('draft', 'in_review'))
);

create policy faqs_staff_update on public.faqs
for update to authenticated
using (
  public.current_profile_role() in ('admin', 'owner')
  or (public.current_profile_role() = 'editor' and published_at is null)
)
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (public.current_profile_role() = 'editor' and published_at is null and review_status in ('draft', 'in_review'))
);

create policy faqs_admin_delete on public.faqs
for delete to authenticated
using (public.current_profile_role() in ('admin', 'owner'));

create policy media_public_read on public.media_assets
for select to anon
using (rights_status = 'approved');

create policy media_staff_read on public.media_assets
for select to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'));

create policy media_staff_write on public.media_assets
for insert to authenticated
with check (public.current_profile_role() in ('editor', 'admin', 'owner') and rights_status <> 'approved');

create policy media_admin_update on public.media_assets
for update to authenticated
using (public.current_profile_role() in ('admin', 'owner'))
with check (public.current_profile_role() in ('admin', 'owner'));

create policy media_admin_delete on public.media_assets
for delete to authenticated
using (public.current_profile_role() in ('admin', 'owner'));

create policy audit_staff_insert on public.audit_log
for insert to authenticated
with check (
  actor_id = auth.uid()
  and public.current_profile_role() in ('editor', 'admin', 'owner')
);

create policy audit_admin_read on public.audit_log
for select to authenticated
using (public.current_profile_role() in ('admin', 'owner'));

create or replace function public.handle_invited_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.invitations%rowtype;
begin
  select * into invite
  from public.invitations
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if invite.id is null then
    raise exception 'An invitation is required before an account can be created.';
  end if;

  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(invite.display_name, split_part(new.email, '@', 1)), invite.role);

  update public.invitations set accepted_at = now() where id = invite.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_invited on auth.users;
create trigger on_auth_user_invited
  after insert on auth.users
  for each row execute function public.handle_invited_user();

insert into public.site_settings (id, emergency_note)
values (
  1,
  'This website does not provide emergency care. If you have sudden weakness, trouble walking, loss of bowel or bladder control, fever with severe back or neck pain, or a recent serious injury, call 911 or go to the nearest emergency department.'
)
on conflict (id) do nothing;
