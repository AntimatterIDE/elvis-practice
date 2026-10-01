"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { deletePortalPatientsAction, loadPortalRosterAction, pushPortalChartsAction } from "@/app/portal/actions";
import {
  enqueuePortalPush,
  markRosterReady,
  mergePortalRoster,
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
          await pushPortalChartsAction(snap);
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
    void whenPortalIdle().then(async () => {
      const result = await loadPortalRosterAction();
      if (cancel) return;
      if (!result.ok) {
        markRosterReady();
        return;
      }
      mergePortalRoster(result.patients, result.appointments);
    });
    return () => {
      cancel = true;
    };
  }, [pathname]);

  return null;
}
