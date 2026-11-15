"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PrescribeDesk } from "@/components/admin/rcm/prescribe-desk";
import { LoadingDesk } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { patientName } from "@/lib/rcm/format";

export function PrescribePageClient() {
  const params = useSearchParams();
  const patientId = params.get("patient") || "";
  const { ready, patients } = useRcm();

  if (!ready) return <LoadingDesk />;

  if (!patientId) {
    return (
      <main>
        <h1 className="font-display text-4xl">Prescribe</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Open a patient chart and choose Medications → Prescribe, or pick a patient below.
        </p>
        <ul className="mt-6 grid gap-2">
          {patients.slice(0, 40).map((patient) => (
            <li key={patient.id}>
              <Link
                href={`/admin/operations/prescribe?patient=${encodeURIComponent(patient.id)}`}
                className="text-sm underline"
              >
                {patientName(patient)}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return <PrescribeDesk patientId={patientId} />;
}
