# Decisions — elvis-practice

## Clinical letter (2026-11-07)

- One **Clinical Letter** template for all visits (not specialty-specific consult PDFs).
- Entry point: Visit Desk button **after Review** (status `review` or `approved`).
- Source of truth: visit note + chart; LLM polish only; empty sections when unsupported.
- Artifact: PDF on Files → Consultation report; attorney/shareable form of the same visit.
