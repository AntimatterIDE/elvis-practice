# Architecture — elvis-practice

## Visit Desk

1. Staff records audio on phone (`useVisitRecorder`).
2. `POST /api/encounters` + uploads → `POST …/process` (transcribe → SOAP note → spine coding suggestions).
3. Status `review` / `approved`: edit codes, approve note+codes, open claims.
4. **Clinical letter** (one template for every visit): button on Visit Desk after review → `POST /api/encounters/[id]/clinical-letter`.
   - Rewrites the existing note + chart context (`lib/encounters/clinical-letter.ts`) — does not invent findings.
   - Branded PDF (`lib/encounters/clinical-letter-pdf.tsx`, `@react-pdf/renderer`, Alignment logo + oxide/clinic-blue).
   - Stored on chart slot `consultation-report` via `storeChartBytes`; returns signed download URL.
   - Requires a matched `patientId` (scheduled visit or visit label matching a chart).

## Chart files

- Bucket `chart-files`; path `{patientId}/{slotId}/{objectKey}`.
- Slots include `consultation-report` (this practice’s letter/report), `outside-records`, etc.
