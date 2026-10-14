"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { deletePortalPatientsAction, loadPortalRosterAction, pushPortalChartsAction } from "@/app/portal/actions";
import {
  enqueuePortalPush,
  markRosterReady,
  mergePortalRoster,
  setPortalSyncError,
  subscribePortalPush,
  subscribePortalRemoval,
  whenPortalIdle,
} from "@/components/admin/rcm/store";

export function PortalBridge() {
  const pathname = usePathname();

  useEffect(
    () =>
      subscribePortalPush((snap) => {
        enqueuePortalPush(async () => {
          const result = await pushPortalChartsAction(snap);
          setPortalSyncError(result.ok ? "" : result.error || "Those charts could not be shared with the practice.");
        });
      }),
    [],
  );

  useEffect(
    () =>
      subscribePortalRemoval((ids) => {
        enqueuePortalPush(async () => {
          await deletePortalPatientsAction(ids);
        });
      }),
    [],
  );

  useEffect(() => {
    let cancel = false;
    async function loadRoster() {
      await whenPortalIdle();
      if (cancel) return;
      const result = await loadPortalRosterAction();
      if (cancel) return;
      if (!result.ok) {
        markRosterReady();
        return;
      }
      mergePortalRoster(result.patients, result.appointments);
    }
    void loadRoster();
    const timer = setInterval(() => void loadRoster(), 15000);
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return null;
}
