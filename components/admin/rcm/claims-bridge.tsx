"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadClaimsAction, upsertClaimsAction } from "@/app/admin/claims/actions";
import {
  enqueuePortalPush,
  markClaimsReady,
  mergeRemoteClaims,
  setPortalSyncError,
  subscribeClaimsPush,
  whenPortalIdle,
} from "@/components/admin/rcm/store";

export function ClaimsBridge() {
  const pathname = usePathname();

  useEffect(
    () =>
      subscribeClaimsPush((claims) => {
        enqueuePortalPush(async () => {
          const result = await upsertClaimsAction(claims);
          if (!result.ok) setPortalSyncError(result.error || "Those claims could not be shared with the practice.");
          else setPortalSyncError("");
        });
      }),
    [],
  );

  useEffect(() => {
    let cancel = false;
    async function loadClaims() {
      await whenPortalIdle();
      if (cancel) return;
      const result = await loadClaimsAction();
      if (cancel) return;
      if (!result.ok) {
        markClaimsReady();
        if (result.error) setPortalSyncError(result.error);
        return;
      }
      const needsUpsert = mergeRemoteClaims(result.claims);
      if (needsUpsert.length) {
        enqueuePortalPush(async () => {
          const saved = await upsertClaimsAction(needsUpsert);
          if (!saved.ok) setPortalSyncError(saved.error || "Those claims could not be shared with the practice.");
        });
      }
    }
    void loadClaims();
    const timer = setInterval(() => void loadClaims(), 15000);
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return null;
}
