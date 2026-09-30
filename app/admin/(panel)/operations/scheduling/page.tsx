import { Suspense } from "react";
import { ScheduleDesk } from "@/components/admin/rcm/schedule-desk";
import { LoadingDesk } from "@/components/admin/rcm/ui";

export default function SchedulingPage() {
  return (
    <Suspense fallback={<LoadingDesk />}>
      <ScheduleDesk />
    </Suspense>
  );
}
