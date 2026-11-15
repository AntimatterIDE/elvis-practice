import { Suspense } from "react";
import { PrescribePageClient } from "@/components/admin/rcm/prescribe-page-client";
import { LoadingDesk } from "@/components/admin/rcm/ui";

export default function PrescribePage() {
  return (
    <Suspense fallback={<LoadingDesk />}>
      <PrescribePageClient />
    </Suspense>
  );
}
