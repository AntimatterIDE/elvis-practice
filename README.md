# The Alignment Clinic

Public site and invitation-only admin for The Alignment Clinic and Elvis Francois, MD. One Next.js codebase. `thealignmentclinic.com` is the canonical host. `elvisfrancoismd.com` redirects there. Confirm that choice before launch.

Clinical pages ship as drafts. They are not public until the practice marks a service as offered, a clinician approves the wording, and an admin publishes it.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Draft clinical pages are visible only in development at `/preview/conditions/[slug]` and `/preview/treatments/[slug]`. They are `noindex`. In production they require a staff session.

## Scripts

- `npm run dev` — local site
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — unit tests, including row-level security against embedded Postgres
- `npm run test:e2e` — Playwright smoke tests
- `npm run seed` — upsert draft content with the Supabase service role

## Supabase

Use a development project, separate from production.

1. Create a Supabase project. Disable public sign-ups in Authentication settings.
2. Apply [supabase/migrations/20260930180000_init.sql](supabase/migrations/20260930180000_init.sql) in the SQL editor, or with the Supabase CLI.
3. Put the project URL and anon key in `.env.local`. Put the service role key only in server environment variables.
4. Insert an owner invitation, then create that user in the Auth dashboard. A trigger refuses accounts that do not have an open invitation and creates the profile.

```sql
insert into public.invitations (email, display_name, role)
values ('you@example.com', 'Your Name', 'owner');
```

5. Require TOTP for owner and admin users before production. Enroll an authenticator, then complete `/admin/mfa`. Development can sign in without a second factor and shows a warning. Production (`VERCEL_ENV=production`) blocks the dashboard until the session is `aal2`.
6. Run `npm run seed` to copy repository drafts into the database. They stay unpublished.
7. Leave `CONTENT_SOURCE=file` until you have reviewed row-level security. `supabase` makes public clinical routes read published rows only.

Roles:

- **Editor** can revise unpublished drafts. Editors cannot publish, approve media rights, change settings, or read the audit log.
- **Admin** can publish and unpublish. Admins cannot change settings or invite owners.
- **Owner** can edit settings and invite any role.

The anon key can read only rows that are approved, published, and, for conditions and treatments, marked offered. The service role bypasses these rules. It is used by the seed script and [lib/supabase/admin.ts](lib/supabase/admin.ts). It is not imported by client components.

Do not store symptoms, histories, insurance numbers, images of patients, or other protected health information in this admin.

## Content workflow

1. Edit a draft in `/admin/conditions` or `/admin/treatments`, or in the TypeScript source while `CONTENT_SOURCE=file`.
2. Read the preview route. It carries a draft banner and an emergency note.
3. A clinician reviews the medical wording.
4. An admin or owner publishes. The publish action refuses unconfirmed services, unapproved reviews, retired template slugs, and copy that names the old reference practice.
5. The public index, sitemap, and navigation omit unpublished pages.

The contact form asks for a name, an email or phone, a reason, and an optional note. It tells people not to include medical information, refuses notes that look clinical, rate-limits submissions, and does not store the note. Until a delivery provider is approved, it also does not send the note, even if `CONTACT_INBOX` is set.

## Deployment

Deploy on Vercel with Preview and Production environments pointing at different Supabase projects.

- Preview: `INDEXING_ENABLED=false`. `robots.txt` disallows the whole site, and pages send `noindex`.
- Production: keep indexing off until the launch checklist below is done. Then set `INDEXING_ENABLED=true` on the production environment only.
- Attach `thealignmentclinic.com` as the production domain when you are ready. Do not change GoDaddy nameservers as part of development.
- Host redirects live in [next.config.ts](next.config.ts) for the physician domain and the `www` hosts. Admin is allowed on localhost, the canonical host, and Vercel preview hosts. It is not served from the redirect domain.
- Rollback: redeploy the previous Vercel deployment. Database migrations are forward-only; do not drop tables to undo a content publish. Unpublish the row instead.

## Launch checklist

Do not index the site, and do not change DNS, until these are confirmed:

- Canonical domain
- Legal practice name, biography, and credentials
- Which conditions and procedures are actually offered
- Address, phone, hours, and booking method
- Photography and written usage rights
- Where administrative messages should go
- Clinician review of medical pages
- Attorney review of privacy, terms, and the disclaimer

After that approval, DNS changes are a separate step. Preserve existing MX, SPF, DKIM, and DMARC records. A website record is an A, ALIAS, or CNAME. It is not a nameserver change.

Google Workspace for `thealignmentclinic.com` is also later. When requested, confirm the admin recovery contacts, create `elvisfrancois@`, `intake@`, and `christinaspinelli@` as real mailboxes unless an alias is explicitly chosen, verify the domain, then update MX, SPF, DKIM, and a DMARC policy that starts at `p=none`. Ordinary email is not a patient-records system.

## Maintenance

- Review audit log entries after publishes.
- Keep dependencies current and rerun `npm test` and `npm run build`.
- Do not add analytics that receive form fields or clinical URLs.
- Add a HIPAA-capable vendor, with an agreement, before any intake, messaging, or records feature.
