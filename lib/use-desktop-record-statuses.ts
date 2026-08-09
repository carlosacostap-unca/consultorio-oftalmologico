"use client";

import { useCallback, useEffect, useState } from "react";
import { pb } from "./pocketbase";
import { isDesktopRuntime } from "./desktop-runtime";
import { buildSyncRecordStatusMap, type SyncRecordStatusMap } from "./desktop-record-status";

export function useDesktopRecordStatuses(): SyncRecordStatusMap {
  const [statuses, setStatuses] = useState<SyncRecordStatusMap>({});

  const refresh = useCallback(async () => {
    if (!isDesktopRuntime() || !pb.authStore.isValid) {
      setStatuses({});
      return;
    }

    const operations = await pb.collection("sync_operations").getFullList({
      filter: 'status != "confirmed"',
      fields: "entity,record_id,status",
      requestKey: null,
    });
    setStatuses(buildSyncRecordStatusMap(operations.map((operation) => ({
      entity: operation.entity,
      record_id: operation.record_id,
      status: operation.status,
    }))));
  }, []);

  useEffect(() => {
    if (!isDesktopRuntime()) return;

    let unsubscribe: (() => void) | undefined;
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    void pb.collection("sync_operations")
      .subscribe("*", () => void refresh())
      .then((nextUnsubscribe) => { unsubscribe = nextUnsubscribe; })
      .catch((error) => console.error("No se pudo observar el estado de sincronización:", error));

    return () => {
      window.clearTimeout(initialRefresh);
      unsubscribe?.();
    };
  }, [refresh]);

  return statuses;
}
