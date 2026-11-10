#!/usr/bin/env python3
"""Score an OCR onboard draft summary against presence checks and exact ground truth."""
from __future__ import annotations

import json
import sys


def has_any(text: str, needles: list[str]) -> bool:
    low = (text or "").lower()
    return any(n.lower() in low for n in needles)


def norm(value: object) -> str:
    return str(value or "").strip().lower()


def score(doc_id: str, summary: dict, expected: dict | None = None) -> dict:
    text_blob = " ".join(
        [
            summary.get("reasonForVisit") or "",
            summary.get("medicalHistory") or "",
            summary.get("imagingFindings") or "",
            summary.get("surgicalHistory") or "",
            json.dumps(summary.get("problems") or []),
            json.dumps(summary.get("injuryCase") or {}),
            " ".join(summary.get("documentHints") or []),
        ]
    )
    checks: list[tuple[str, bool, str]] = []

    def add(name: str, ok: bool, detail: str = ""):
        checks.append((name, ok, detail))

    name_ok = bool((summary.get("firstName") or "").strip() or (summary.get("lastName") or "").strip())
    add("identity_name", name_ok, f"{summary.get('firstName','')} {summary.get('lastName','')}".strip())

    if "imaging" in doc_id or "mri" in doc_id or "cervical-mva" in doc_id or "lumbar-mva" in doc_id or "full-spine" in doc_id:
        add(
            "imaging_findings",
            has_any(summary.get("imagingFindings") or "", ["disc", "herniat", "stenos", "C", "L", "radicul", "impression"]),
            (summary.get("imagingFindings") or "")[:120],
        )
        add("hint_imaging", "outside-imaging" in (summary.get("documentHints") or []), ",".join(summary.get("documentHints") or []))

    if "emg" in doc_id or "cervical-mva" in doc_id or "lumbar-mva" in doc_id or "full-spine" in doc_id or "mva-chiro" in doc_id:
        add(
            "problems_or_emg",
            bool(summary.get("problems")) or has_any(text_blob, ["radiculopathy", "EMG", "neuropathy"]),
            json.dumps(summary.get("problems") or [])[:160],
        )

    if "pi" in doc_id or "mva" in doc_id or "wc" in doc_id or "chiro" in doc_id or "full-spine" in doc_id:
        injury = summary.get("injuryCase") or {}
        add(
            "injury_or_mva_narrative",
            bool(injury and any(injury.get(k) for k in ("dateOfInjury", "description", "notes")))
            or has_any(text_blob, ["accident", "MVA", "motor vehicle", "injury", "sprain"]),
            json.dumps(injury)[:160] if injury else "no injuryCase",
        )

    if "insurance" in doc_id or "encounter" in doc_id:
        add(
            "payer_or_member",
            bool(summary.get("payerName") or summary.get("memberId")),
            f"payer={summary.get('payerName')} member={summary.get('memberId')}",
        )

    add(
        "reason_or_history",
        bool(summary.get("reasonForVisit") or summary.get("medicalHistory")),
        (summary.get("reasonForVisit") or summary.get("medicalHistory") or "")[:120],
    )

    # Exact + soft ground-truth comparisons when provided (presence checks still run above).
    if expected:
        soft_skip = {
            "documentHints",
            "likely_gaps",
            "likely_fields",
            "injuryCase",
            "reasonForVisit_or_history",
            "problems_should_mention",
            "imagingFindings_should_mention",
        }
        for key, want in expected.items():
            if key.endswith("_should_mention") or key in soft_skip:
                continue
            got = summary.get(key, "")
            ok = norm(got) == norm(want)
            add(f"exact_{key}", ok, f"want={want} got={got}")

        if isinstance(expected.get("documentHints"), list):
            hints = summary.get("documentHints") or []
            for hint in expected["documentHints"]:
                add(f"hint_{hint}", hint in hints, ",".join(hints))

        problems_blob = json.dumps(summary.get("problems") or [])
        if isinstance(expected.get("problems_should_mention"), list):
            needles = expected["problems_should_mention"]
            ok = has_any(problems_blob, needles) or has_any(text_blob, needles)
            add("soft_problems_should_mention", ok, problems_blob[:160])

        if isinstance(expected.get("imagingFindings_should_mention"), list):
            needles = expected["imagingFindings_should_mention"]
            imaging = summary.get("imagingFindings") or ""
            ok = has_any(imaging, needles)
            add("soft_imagingFindings_should_mention", ok, imaging[:160])

        if isinstance(expected.get("reasonForVisit_or_history"), list):
            needles = expected["reasonForVisit_or_history"]
            history = " ".join(
                [
                    summary.get("reasonForVisit") or "",
                    summary.get("medicalHistory") or "",
                ]
            )
            ok = has_any(history, needles) or has_any(text_blob, needles)
            add("soft_reasonForVisit_or_history", ok, history[:160])

        if expected.get("injuryCase") is True:
            injury = summary.get("injuryCase") or {}
            ok = bool(injury and any(injury.get(k) for k in ("dateOfInjury", "description", "notes"))) or has_any(
                text_blob, ["accident", "MVA", "motor vehicle", "injury", "sprain"]
            )
            add("soft_injuryCase", ok, json.dumps(injury)[:160] if injury else "no injuryCase")

    passed = sum(1 for _, ok, _ in checks if ok)
    total = len(checks) or 1
    return {
        "id": doc_id,
        "score": round(100 * passed / total),
        "passed": passed,
        "total": total,
        "checks": [{"name": n, "ok": ok, "detail": d} for n, ok, d in checks],
        "warnings": summary.get("warnings") or [],
        "name": f"{summary.get('firstName','')} {summary.get('lastName','')}".strip(),
        "hints": summary.get("documentHints") or [],
    }


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    print(json.dumps(score(payload["id"], payload["summary"], payload.get("expected")), indent=2))
