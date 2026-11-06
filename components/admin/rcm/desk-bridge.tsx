"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadPracticeDeskAction, upsertPracticeDeskAction } from "@/app/admin/desk/actions";
import {
  enqueuePortalPush,
  markDeskReady,
  mergeRemoteDesk,
  setPortalSyncError,
  subscribeDeskPush,
  whenPortalIdle,
} from "@/components/admin/rcm/store";

export function DeskBridge() {
  const pathname = usePathname();

  useEffect(
    () =>
      subscribeDeskPush((desk) => {
        enqueuePortalPush(async () => {
          const result = await upsertPracticeDeskAction(desk);
          if (!result.ok) setPortalSyncError(result.error || "The practice profile could not be shared with the practice.");
          else setPortalSyncError("");
        });
      }),
    [],
  );

  useEffect(() => {
    let cancel = false;
    async function loadDesk() {
      await whenPortalIdle();
      if (cancel) return;
      const result = await loadPracticeDeskAction();
      if (cancel) return;
      if (!result.ok) {
        markDeskReady();
        if (result.error) setPortalSyncError(result.error);
        return;
      }
      const needsUpsert = mergeRemoteDesk(result.desk);
      if (needsUpsert) {
        enqueuePortalPush(async () => {
          const saved = await upsertPracticeDeskAction(needsUpsert);
          if (!saved.ok) setPortalSyncError(saved.error || "The practice profile could not be shared with the practice.");
        });
      }
    }
    void loadDesk();
    const timer = setInterval(() => void loadDesk(), 15000);
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return null;
}
