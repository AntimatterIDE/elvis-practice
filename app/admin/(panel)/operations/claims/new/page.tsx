import { Suspense } from "react";
import { ClaimForm } from "@/components/admin/rcm/claim-form";

export default function NewClaimPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading claim form…</p>}>
      <ClaimForm />
    </Suspense>
  );
}
