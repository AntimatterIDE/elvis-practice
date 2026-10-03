# Workspace Map — ch_murexqna_2
_Generated 2026-10-02 · 187 files · 68 directories_  
_Deterministic structural map. Regenerate with the `map` tool or "Antimatter: Map Workspace". Do not hand-edit._

## Languages
- TypeScript: 170
- Markdown: 3
- JSON: 3
- JavaScript: 2
- SQL: 2
- CSS: 1

## Key files
- `package.json`
- `README.md`
- `tsconfig.json`

## Directories
### `(root)` — 14 files
- symbols: proxy (fn), config (const)
- files: .env.example, .gitignore, AGENTS.md, CLAUDE.md, eslint.config.mjs, next.config.ts, package-lock.json, package.json, playwright.config.ts, postcss.config.mjs, proxy.ts, README.md, tsconfig.json, vitest.config.ts

### `app` — 9 files
- symbols: metadata (const), size (const), contentType (const)
- files: favicon.ico, global-error.tsx, globals.css, icon.svg, layout.tsx, not-found.tsx, opengraph-image.tsx, robots.ts, sitemap.ts

### `app/(site)` — 4 files
- symbols: metadata (const)
- files: error.tsx, layout.tsx, not-found.tsx, page.tsx

### `app/(site)/about` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/conditions` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/conditions/[slug]` — 1 file
- symbols: generateStaticParams (fn), generateMetadata (fn)
- files: page.tsx

### `app/(site)/contact` — 2 files
- symbols: submitInquiry (fn), ContactState (type), metadata (const)
- files: actions.ts, page.tsx

### `app/(site)/dr-elvis-francois` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/medical-disclaimer` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/preview/conditions/[slug]` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/preview/treatments/[slug]` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/privacy` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/questions` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/terms` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/treatments` — 1 file
- symbols: metadata (const)
- files: page.tsx

### `app/(site)/treatments/[slug]` — 1 file
- symbols: generateStaticParams (fn), generateMetadata (fn)
- files: page.tsx

### `app/(site)/visit` — 2 files
- symbols: metadata (const)
- files: loading.tsx, page.tsx

### `app/admin` — 2 files
- symbols: signIn (fn), signOut (fn), verifyTotp (fn), requestStaffPasswordReset (fn), updateStaffPassword (fn), enrollTotp (fn), saveClinical (fn), saveFaq (fn), saveMedia (fn), saveSettings (fn), inviteEditor (fn), AdminFormState (type)
- files: actions.ts, layout.tsx

### `app/admin/(panel)` — 2 files
- files: layout.tsx, page.tsx

### `app/admin/(panel)/audit` — 1 file
- files: page.tsx

### `app/admin/(panel)/conditions` — 1 file
- files: page.tsx

### `app/admin/(panel)/conditions/[slug]` — 1 file
- files: page.tsx

### `app/admin/(panel)/faqs` — 1 file
- files: page.tsx

### `app/admin/(panel)/media` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations` — 2 files
- files: layout.tsx, page.tsx

### `app/admin/(panel)/operations/analytics` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/claims` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/claims/[id]` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/claims/drafts` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/claims/new` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/denials` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/eligibility` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/intake` — 1 file
- symbols: dynamic (const)
- files: page.tsx

### `app/admin/(panel)/operations/patients` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/patients/[id]` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/practice` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/scheduling` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/tasks` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/tools` — 1 file
- files: page.tsx

### `app/admin/(panel)/operations/upload` — 1 file
- files: page.tsx

### `app/admin/(panel)/settings` — 1 file
- files: page.tsx

### `app/admin/(panel)/treatments` — 1 file
- files: page.tsx

### `app/admin/(panel)/treatments/[slug]` — 1 file
- files: page.tsx

### `app/admin/forgot` — 1 file
- files: page.tsx

### `app/admin/login` — 1 file
- files: page.tsx

### `app/admin/mfa` — 1 file
- files: page.tsx

### `app/admin/reset-password` — 1 file
- files: page.tsx

### `app/auth/confirm` — 1 file
- symbols: GET (fn)
- files: route.ts

### `app/intake/[token]` — 1 file
- symbols: dynamic (const), metadata (const)
- files: page.tsx

### `app/portal` — 3 files
- symbols: saveIntakeFormAction (fn), createIntakeInviteAction (fn), intakeSnapshotAction (fn), submitIntakeAction (fn), issuePortalLoginAction (fn), portalAccountAction (fn), loadPortalRosterAction (fn), pushPortalChartsAction (fn), deletePortalPatientsAction (fn), portalSignInAction (fn), portalSignOutAction (fn), metadata (const), dynamic (const)
- files: actions.ts, layout.tsx, page.tsx

### `app/portal/login` — 1 file
- symbols: dynamic (const)
- files: page.tsx

### `components/admin` — 7 files
- symbols: AdminNav (fn), ClinicalEditor (fn), EnrollForm (fn), LoginForm (fn), MfaForm (fn), ForgotPasswordForm (fn), NewPasswordForm (fn), AdminStateForm (fn)
- files: admin-nav.tsx, clinical-editor.tsx, enroll-form.tsx, login-form.tsx, mfa-form.tsx, password-reset-form.tsx, state-form.tsx

### `components/admin/rcm` — 20 files
- symbols: AnalyticsDesk (fn), ClaimDetail (fn), ClaimForm (fn), ClaimsDesk (fn), DenialsDesk (fn), DraftsDesk (fn), EligibilityDesk (fn), IntakeDesk (fn), PatientDetail (fn), PatientsDesk (fn), PortalAccess (fn), PortalBridge (fn), PracticeDesk (fn), ScheduleDesk (fn), subscribePortalRemoval (fn), subscribePortalPush (fn), enqueuePortalPush (fn), whenPortalIdle (fn), markRosterReady (fn), notePortalPatient (fn), mergePortalRoster (fn), RcmProvider (fn), useRcm (fn), TasksDesk (fn)
- files: analytics-desk.tsx, claim-detail.tsx, claim-form.tsx, claims-desk.tsx, denials-desk.tsx, drafts-desk.tsx, eligibility-desk.tsx, intake-desk.tsx, patient-detail.tsx, patients-desk.tsx, portal-access.tsx, portal-bridge.tsx, practice-desk.tsx, schedule-desk.tsx, store.tsx, tasks-desk.tsx, tools-desk.tsx, ui.tsx, upload-desk.tsx, workbench.tsx

### `components/clinic` — 1 file
- symbols: ClinicFrame (fn)
- files: frame.tsx

### `components/portal` — 2 files
- symbols: IntakeForm (fn), PortalLoginForm (fn)
- files: intake-form.tsx, login-form.tsx

### `components/site` — 23 files
- symbols: AlignmentRule (fn), CareIndex (fn), ClinicalArticle (fn), ContactForm (fn), EmergencyNote (fn), FocusCycle (fn), Footer (fn), Header (fn), IconArrow (fn), IconMenu (fn), IconClose (fn), IconRule (fn), IconPlus (fn), IconNeck (fn), IconLowBack (fn), IconAfterSurgery (fn), IconVisit (fn), IndexCard (fn), LoadingState (fn), Mark (fn), Markdown (fn), MissingPage (fn), MobileNav (fn), PageIntro (fn)
- files: alignment-rule.tsx, care-index.tsx, clinical-article.tsx, contact-form.tsx, emergency-note.tsx, focus-cycle.tsx, footer.tsx, header.tsx, icons.tsx, index-card.tsx, loading-state.tsx, mark.tsx, markdown.tsx, missing-page.tsx, mobile-nav.tsx, page-intro.tsx, photo-placeholder.tsx, reveal.tsx, review-banner.tsx, site-link.tsx, spine-art.tsx, sticky-contact.tsx, structured-data.tsx

### `components/ui` — 8 files
- symbols: AccordionItem (fn), AccordionTrigger (fn), AccordionContent (fn), Accordion (const), Button (fn), controlClass (const), Input (fn), Label (fn), Select (fn), Separator (fn), Textarea (fn)
- files: accordion.tsx, button.tsx, control.ts, input.tsx, label.tsx, select.tsx, separator.tsx, textarea.tsx

### `lib` — 5 files
- symbols: isDemoAdminEnabled (fn), DEMO_ADMIN_EMAIL (const), DEMO_ADMIN_PASSWORD (const), DEMO_ADMIN_COOKIE (const), DEMO_ADMIN_COOKIE_VALUE (const), readServerEnv (fn), isSupabaseConfigured (fn), isServiceRoleConfigured (fn), ServerEnv (type), rateLimit (fn), canonicalOrigin (fn), canonicalHost (fn), isIndexingEnabled (fn), canViewDraftsWithoutAuth (fn), isAdminHostAllowed (fn), practice (const), physicianTraining (const), clinicalFocus (const), emergencyNote (const), publicNav (const), carePathways (const), cn (fn)
- files: demo-admin.ts, env.ts, rate-limit.ts, site.ts, utils.ts

### `lib/contact` — 1 file
- symbols: noteLooksClinical (fn)
- files: guard.ts

### `lib/content` — 7 files
- symbols: conditions (const), faqs (const), allClinicalDocuments (fn), getCondition (fn), getTreatment (fn), getClinicalDocument (fn), publicPath (fn), previewPath (fn), publicConditions (fn), publicTreatments (fn), publicClinicalDocuments (fn), renderMarkdown (fn), documentText (fn), findBannedPhrases (fn), canPublish (fn), isPubliclyVisible (fn), retiredSlugs (const), ClinicalDocument (type), OfferingStatus (type), ReviewStatus (type), ContactInquiry (type), slugSchema (const), offeringStatusSchema (const), reviewStatusSchema (const)
- files: conditions.ts, faqs.ts, index.ts, markdown.ts, publish.ts, schema.ts, treatments.ts

### `lib/portal` — 9 files
- symbols: readPortalCookie (fn), writePortalCookie (fn), clearPortalCookie (fn), PORTAL_COOKIE (const), defaultIntakeForm (fn), sexLabel (fn), LOCKED_FIELD_IDS (const), CHART_FIELDS (const), createPortalDb (fn), saveForm (fn), cleanAnswers (fn), patientFromAnswers (fn), createInvite (fn), findInvite (fn), submitIntake (fn), issueLogin (fn), markPortalActive (fn), createSession (fn), sessionExpiry (fn), readSession (fn), fileStore (const), hashPassword (fn), verifyPassword (fn), generatePassword (fn)
- files: cookie.ts, defaults.ts, engine.ts, file-store.ts, password.ts, repository.ts, supabase-store.ts, types.ts, view.ts

### `lib/rcm` — 6 files
- symbols: emptyVitals (fn), defaultDocuments (fn), defaultCoverage (fn), withChart (fn), normalizePatient (fn), normalizeAppointment (fn), normalizeState (fn), primaryCoverage (fn), applyPrimaryCoverage (fn), chartGaps (fn), ageFromDob (fn), localIsoDay (fn), money (fn), patientName (fn), claimTotal (fn), formatDay (fn), formatWhen (fn), formatTime (fn), formatClinicDay (fn), statusLabel (fn), parsePracticeCsv (fn), CsvRow (type), CsvParseResult (type), summarizeClaims (fn)
- files: chart.ts, format.ts, import.ts, metrics.ts, seed.ts, types.ts

### `lib/supabase` — 5 files
- symbols: createSupabaseAdminClient (fn), StaffRole (type), ReviewStatus (type), OfferingStatus (type), RightsStatus (type), Json (type), Database (type), clinicalRowToDocument (fn), createSupabaseServerClient (fn), getStaffSession (fn), StaffSession (type)
- files: admin.ts, database.ts, map-clinical.ts, server.ts, session.ts

### `public` — 2 files
- files: globe.svg, next.svg

### `scripts` — 1 file
- files: seed-content.ts

### `supabase/migrations` — 2 files
- files: 20260930180000_init.sql, 20261001170000_patient_portal.sql

### `tests` — 5 files
- files: portal.test.ts, publish.test.ts, rcm.test.ts, rls.test.ts, secrets.test.ts

### `tests/e2e` — 1 file
- files: smoke.spec.ts
