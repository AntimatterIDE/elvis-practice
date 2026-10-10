-- Journal notes stay unpublished until a staff member approves them.

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  title text not null check (char_length(title) between 8 and 140),
  summary text not null check (char_length(summary) between 40 and 400),
  body text not null check (char_length(body) between 400 and 12000),
  seo_title text not null check (char_length(seo_title) between 8 and 70),
  seo_description text not null check (char_length(seo_description) between 40 and 180),
  sources jsonb not null default '[]'::jsonb,
  review_status text not null default 'draft' check (review_status in ('draft', 'approved')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_publish_guard check (published_at is null or review_status = 'approved')
);

alter table public.articles enable row level security;

grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;

create policy articles_public_read on public.articles
for select to anon
using (published_at is not null and review_status = 'approved');

create policy articles_staff_read on public.articles
for select to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'));

create policy articles_staff_insert on public.articles
for insert to authenticated
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (
    public.current_profile_role() = 'editor'
    and published_at is null
    and review_status = 'draft'
  )
);

create policy articles_staff_update on public.articles
for update to authenticated
using (public.current_profile_role() in ('editor', 'admin', 'owner'))
with check (
  public.current_profile_role() in ('admin', 'owner')
  or (
    public.current_profile_role() = 'editor'
    and published_at is null
    and review_status = 'draft'
  )
);

create policy articles_admin_delete on public.articles
for delete to authenticated
using (public.current_profile_role() in ('admin', 'owner'));
