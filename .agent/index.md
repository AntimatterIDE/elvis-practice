# elvis-practice — Agent Knowledge Index

Compiled memory for **The Alignment Clinic** (Next.js + Supabase on Vercel; Stedi 837P).

## Pages

| Page | Summary |
|------|---------|
| [wiki/architecture.md](wiki/architecture.md) | Site, admin Visit Desk, chart files, OCR, clinical letter |
| [wiki/bugs.md](wiki/bugs.md) | Solved errors and OCR/visit gotchas |
| [wiki/decisions.md](wiki/decisions.md) | Current product rulings |

## Surface

- Public site: Alignment branding (`lib/site.ts`, oxide/clinic-blue).
- Admin Visit Desk: `components/admin/visit-desk.tsx` — record → note → review codes → approve → claims.
- Chart Files: Supabase `chart-files` bucket via `lib/chart-files/store.ts`.
- OCR: extract after upload → review → explicit accept (`ChartExtractReview`); never auto-writes the chart.
- Bulk folder import on Patient intake: flippable Approve/Deny draft cards, then create approved charts only.
- Claims: POS select + surgery warning; corrected/void frequency (7/8) with payer claim control number.
