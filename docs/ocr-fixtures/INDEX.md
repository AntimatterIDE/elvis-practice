# Records OCR fixtures (Alignment)

Public / sample / redacted PDFs that resemble packets patients bring from other doctors
(spine MRI, EMG/NCV, MVA/PI narrative, WC/IME). **Not** practice PHI.

## Quick test (best first)

On **Admin → Intake → Records**, upload one combined packet:

1. `packets/full-spine-pi-packet/full-spine-pi-packet-combined.pdf` — PI narrative + cervical MRI + lumbar MRI + EMG (~31p)
2. `packets/lumbar-mva-imaging-emg/lumbar-mva-imaging-emg-combined.pdf` — MVA lumbar MRI + lumbar EMG
3. `packets/cervical-mva-imaging-emg/cervical-mva-imaging-emg-combined.pdf` — cervical MRI + cervical EMG
4. `packets/mva-chiro-to-spine/mva-chiro-to-spine-combined.pdf` — MVA chiro narrative + cervical MRI + EMG
5. `packets/wc-legal-spine-lite/wc-legal-spine-lite-combined.pdf` — WC QME + IME + MVA narrative (prefer over full wc-legal-spine)
6. `packets/wc-legal-spine/wc-legal-spine-combined.pdf` — heavy chronological PI summary (stress test)

Or multi-select the part PDFs under each packet folder / `singles/`.

## Layout

- `singles/` — one report per file (imaging, EMG, PI, WC)
- `packets/` — ready-made multi-doc merges + copies of parts
- `manifest.json` — sizes, hashes, expected extraction hints
- Root `*.pdf` — original downloads (sources); prefer `singles/` / `packets/` for tests

## What these exercise

| Field / behavior | Best packets |
|------------------|--------------|
| Imaging findings / outside-imaging | cervical-mva, lumbar-mva, full-spine |
| Problems / radiculopathy ICDs | EMG packets, full-spine |
| Injury DOI / MVA narrative | full-spine, mva-chiro, wc-legal |
| No-fault / legal medicals hints | full-spine, wc-legal |
| Insurance/member (thin) | `singles/encounter-insurance-fictional.pdf` |

Real Palmquist/Agonaldo packets remain the gold standard; these fill the public gap.
