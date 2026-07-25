"use client";

import { useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { loadDesktopActivation } from "@/lib/desktop-sync/client";
import { runDesktopSync } from "@/lib/desktop-sync/engine";

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
    window.addEventListener("online", handleOnline);
    const interval = window.setInterval(() => void trigger(), 120_000);

    return () => {
      disposed = true;
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
