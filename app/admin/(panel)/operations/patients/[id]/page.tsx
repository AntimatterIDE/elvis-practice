"use client";

import { useParams } from "next/navigation";
import { PatientDetail } from "@/components/admin/rcm/patient-detail";

export default function PatientPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  return <PatientDetail id={id} />;
}
