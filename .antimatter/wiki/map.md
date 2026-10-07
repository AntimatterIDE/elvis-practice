# Workspace Map — ch_muyabpr2_1
_Generated 2026-10-07 · 218 files · 73 directories_  
_Deterministic structural map. Regenerate with the `map` tool or "Antimatter: Map Workspace". Do not hand-edit._

## Languages
- TypeScript: 174
- Markdown: 9
- JSON: 4
- JavaScript: 2
- SQL: 2
- CSS: 1
- HTML: 1

## Key files
- `package.json`
- `README.md`
- `tsconfig.json`

## Directories
### `.antimatter/wiki` — 6 files
- files: index.md, log.md, map.json, map.md, overview.md, schema.md

### `(root)` — 14 files
- symbols: proxy (fn), config (const)
- files: .env.example, .gitignore, AGENTS.md, CLAUDE.md, eslint.config.mjs, next.config.ts, package-lock.json, package.json, playwright.config.ts, postcss.config.mjs, proxy.ts, README.md, tsconfig.json, vitest.config.ts

### `app` — 7 files
- symbols: metadata (const)
- files: favicon.ico, global-error.tsx, globals.css, layout.tsx, not-found.tsx, robots.ts, sitemap.ts

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
- symbols: signIn (fn), signOut (fn), verifyTotp (fn), requestStaffPasswordReset (fn), updateStaffPassword (fn), enrollTotp (fn), saveClinical (fn), saveFaq (fn), saveMedia (fn), saveSettings (fn), inviteEditor (fn), AdminFormState (type), metadata (const)
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

### `app/auth/confirm` — 3 files
- symbols: completeRecovery (fn), RecoveryState (type), ContinueForm (fn)
- files: actions.ts, continue-form.tsx, page.tsx

### `app/intake/[token]` — 1 file
- symbols: dynamic (const), metadata (const)
- files: page.tsx

### `app/portal` — 3 files
- symbols: saveIntakeFormAction (fn), createIntakeInviteAction (fn), intakeSnapshotAction (fn), submitIntakeAction (fn), issuePortalLoginAction (fn), portalAccountAction (fn), loadPortalRosterAction (fn), pushPortalChartsAction (fn), deletePortalPatientsAction (fn), portalSignInAction (fn), portalSignOutAction (fn), metadata (const), dynamic (const)
- files: actions.ts, layout.tsx, page.tsx

### `app/portal/login` — 1 file
- symbols: dynamic (const)
- files: page.tsx

### `brand` — 2 files
- files: email-signature.html, identity-direction.md

### `components/admin` — 8 files
- symbols: AdminMobileBar (fn), currentDeskLabel (fn), AdminNav (fn), ClinicalEditor (fn), EnrollForm (fn), LoginForm (fn), MfaForm (fn), ForgotPasswordForm (fn), NewPasswordForm (fn), AdminStateForm (fn)
- files: admin-mobile-bar.tsx, admin-nav.tsx, clinical-editor.tsx, enroll-form.tsx, login-form.tsx, mfa-form.tsx, password-reset-form.tsx, state-form.tsx

### `components/admin/rcm` — 21 files
- symbols: AnalyticsDesk (fn), ClaimDetail (fn), ClaimForm (fn), ClaimsDesk (fn), DaySheet (fn), DenialsDesk (fn), DraftsDesk (fn), EligibilityDesk (fn), IntakeDesk (fn), PatientDetail (fn), PatientsDesk (fn), PortalAccess (fn), PortalBridge (fn), PracticeDesk (fn), ScheduleDesk (fn), subscribePortalRemoval (fn), subscribePortalPush (fn), enqueuePortalPush (fn), whenPortalIdle (fn), markRosterReady (fn), notePortalPatient (fn), mergePortalRoster (fn), RcmProvider (fn), useRcm (fn)
- files: analytics-desk.tsx, claim-detail.tsx, claim-form.tsx, claims-desk.tsx, day-sheet.tsx, denials-desk.tsx, drafts-desk.tsx, eligibility-desk.tsx, intake-desk.tsx, patient-detail.tsx, patients-desk.tsx, portal-access.tsx, portal-bridge.tsx, practice-desk.tsx, schedule-desk.tsx, store.tsx, tasks-desk.tsx, tools-desk.tsx, ui.tsx, upload-desk.tsx, workbench.tsx

### `components/clinic` — 1 file
- symbols: ClinicFrame (fn)
- files: frame.tsx

### `components/portal` — 2 files
- symbols: IntakeForm (fn), PortalLoginForm (fn)
- files: intake-form.tsx, login-form.tsx

### `components/site` — 22 files
- symbols: AlignmentRule (fn), BrandLogo (fn), BrandMark (fn), BrandIcon (fn), HeroArtwork (fn), CareIndex (fn), ClinicalArticle (fn), ContactForm (fn), EmergencyNote (fn), Footer (fn), Header (fn), IconArrow (fn), IconMenu (fn), IconClose (fn), IconPlus (fn), IndexCard (fn), LoadingState (fn), Markdown (fn), MissingPage (fn), MobileNav (fn), PageIntro (fn), PhotoPlaceholder (fn), Promises (fn), Reveal (fn)
- files: alignment-rule.tsx, brand.tsx, care-index.tsx, clinical-article.tsx, contact-form.tsx, emergency-note.tsx, footer.tsx, header.tsx, icons.tsx, index-card.tsx, loading-state.tsx, markdown.tsx, missing-page.tsx, mobile-nav.tsx, page-intro.tsx, photo-placeholder.tsx, promises.tsx, reveal.tsx, review-banner.tsx, site-link.tsx, sticky-contact.tsx, structured-data.tsx

### `components/ui` — 8 files
- symbols: AccordionItem (fn), AccordionTrigger (fn), AccordionContent (fn), Accordion (const), Button (fn), controlClass (const), Input (fn), Label (fn), Select (fn), Separator (fn), Textarea (fn)
- files: accordion.tsx, button.tsx, control.ts, input.tsx, label.tsx, select.tsx, separator.tsx, textarea.tsx

### `lib` — 6 files
- symbols: isDemoAdminEnabled (fn), DEMO_ADMIN_EMAIL (const), DEMO_ADMIN_PASSWORD (const), DEMO_ADMIN_COOKIE (const), DEMO_ADMIN_COOKIE_VALUE (const), readServerEnv (fn), isSupabaseConfigured (fn), isServiceRoleConfigured (fn), ServerEnv (type), rateLimit (fn), publicPageMetadata (fn), shareImage (const), unlistedShareMetadata (const), canonicalOrigin (fn), canonicalHost (fn), isIndexingEnabled (fn), canViewDraftsWithoutAuth (fn), isAdminHostAllowed (fn), practice (const), physicianTraining (const), clinicalFocus (const), emergencyNote (const), publicNav (const), carePathways (const)
- files: demo-admin.ts, env.ts, rate-limit.ts, share-metadata.ts, site.ts, utils.ts

### `lib/contact` — 1 file
- symbols: noteLooksClinical (fn)
- files: guard.ts

### `lib/content` — 7 files
- symbols: conditions (const), faqs (const), allClinicalDocuments (fn), getCondition (fn), getTreatment (fn), getClinicalDocument (fn), publicPath (fn), previewPath (fn), publicConditions (fn), publicTreatments (fn), publicClinicalDocuments (fn), renderMarkdown (fn), documentText (fn), findBannedPhrases (fn), canPublish (fn), isPubliclyVisible (fn), retiredSlugs (const), ClinicalDocument (type), OfferingStatus (type), ReviewStatus (type), ContactInquiry (type), slugSchema (const), offeringStatusSchema (const), reviewStatusSchema (const)
- files: conditions.ts, faqs.ts, index.ts, markdown.ts, publish.ts, schema.ts, treatments.ts

### `lib/portal` — 10 files
- symbols: readPortalCookie (fn), writePortalCookie (fn), clearPortalCookie (fn), PORTAL_COOKIE (const), defaultIntakeForm (fn), sexLabel (fn), LOCKED_FIELD_IDS (const), CHART_FIELDS (const), createPortalDb (fn), saveForm (fn), cleanAnswers (fn), patientFromAnswers (fn), createInvite (fn), findInvite (fn), submitIntake (fn), issueLogin (fn), markPortalActive (fn), createSession (fn), sessionExpiry (fn), readSession (fn), fileStore (const), intakeSectionKey (fn), intakeBlocks (fn), intakeFieldSpan (fn)
- files: cookie.ts, defaults.ts, engine.ts, file-store.ts, form-layout.ts, password.ts, repository.ts, supabase-store.ts, types.ts, view.ts

### `lib/rcm` — 6 files
- symbols: emptyVitals (fn), defaultDocuments (fn), defaultCoverage (fn), withChart (fn), normalizePatient (fn), normalizeAppointment (fn), normalizeState (fn), primaryCoverage (fn), applyPrimaryCoverage (fn), chartGaps (fn), ageFromDob (fn), localIsoDay (fn), money (fn), patientName (fn), claimTotal (fn), formatDay (fn), formatWhen (fn), formatTime (fn), formatClinicDay (fn), statusLabel (fn), parsePracticeCsv (fn), CsvRow (type), CsvParseResult (type), summarizeClaims (fn)
- files: chart.ts, format.ts, import.ts, metrics.ts, seed.ts, types.ts

### `lib/supabase` — 5 files
- symbols: createSupabaseAdminClient (fn), StaffRole (type), ReviewStatus (type), OfferingStatus (type), RightsStatus (type), Json (type), Database (type), clinicalRowToDocument (fn), createSupabaseServerClient (fn), getStaffSession (fn), StaffSession (type)
- files: admin.ts, database.ts, map-clinical.ts, server.ts, session.ts

### `public` — 3 files
- files: apple-touch-icon.png, globe.svg, next.svg

### `public/brand` — 10 files
- files: alignment-favicon.svg, alignment-hero-graphic.svg, alignment-logo-physician.svg, alignment-logo.png, alignment-logo.svg, alignment-mark-reverse.svg, alignment-mark.svg, favicon-32.png, og.png, social-avatar.png

### `public/brand/icons` — 8 files
- files: clear-plan.svg, low-back-pain.svg, neck-pain.svg, plain-language.svg, reassessment.svg, shared-decisions.svg, unhurried-visits.svg, visit-process.svg

### `public/photos` — 1 file
- files: elvis-francois.jpg

### `scripts` — 1 file
- files: seed-content.ts

### `supabase/migrations` — 2 files
- files: 20260930180000_init.sql, 20261001170000_patient_portal.sql

### `tests` — 5 files
- files: portal.test.ts, publish.test.ts, rcm.test.ts, rls.test.ts, secrets.test.ts

### `tests/e2e` — 1 file
- files: smoke.spec.ts
