"use client";

import { useParams } from "next/navigation";
import { ClaimDetail } from "@/components/admin/rcm/claim-detail";

export default function ClaimPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  return <ClaimDetail id={id} />;
}
