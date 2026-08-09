"use client";

import { useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { loadDesktopActivation } from "@/lib/desktop-sync/client";
import {
  prepareDesktopSyncForMaintenance,
  releaseDesktopSyncMaintenance,
  runDesktopSync,
} from "@/lib/desktop-sync/engine";

export function DesktopSyncProvider() {
  useEffect(() => {
    if (!window.consultorioDesktop) return;
    let disposed = false;

    const trigger = async () => {
      if (disposed || !pb.authStore.isValid) return;
      const activation = await loadDesktopActivation();
      if (!activation?.bootstrapCompleted || disposed) return;
      await runDesktopSync();
    };

    const unsubscribe = pb.authStore.onChange(() => void trigger(), true);
    const handleOnline = () => void trigger();
    const handleUpdateOnline = () => void window.consultorioDesktop?.updates.check();
    window.addEventListener("online", handleOnline);
    window.addEventListener("online", handleUpdateOnline);
    const interval = window.setInterval(() => void trigger(), 120_000);
    const unsubscribeMaintenance = window.consultorioDesktop.maintenance.onPrepare(async (requestId) => {
      try {
        const status = await prepareDesktopSyncForMaintenance();
        await window.consultorioDesktop?.maintenance.ready(requestId, {
          ok: true,
          pending: status.pending,
          errors: status.errors,
          conflicts: status.conflicts,
        });
      } catch {
        await window.consultorioDesktop?.maintenance.ready(requestId, { ok: false, pending: 0, errors: 0, conflicts: 0 });
      }
    });
    const unsubscribeRelease = window.consultorioDesktop.maintenance.onRelease(() => releaseDesktopSyncMaintenance());

    return () => {
      disposed = true;
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("online", handleUpdateOnline);
      window.clearInterval(interval);
      unsubscribeMaintenance();
      unsubscribeRelease();
    };
  }, []);

  return null;
}
