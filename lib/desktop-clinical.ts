"use client";

import { pb } from "./pocketbase";
import { createTemporaryFicha } from "./desktop-sync/core";

export async function deleteClinicalRecord(collection: "pacientes" | "consultas" | "recetas", id: string) {
  if (!window.consultorioDesktop) {
    await pb.collection(collection).delete(id);
    return;
  }

  await pb.collection(collection).update(id, {
    sync_deleted: true,
    sync_deleted_at: new Date().toISOString(),
    sync_deleted_by: pb.authStore.record?.id || "",
  });
}

export async function nextDesktopTemporaryFicha() {
  const runtime = window.consultorioDesktop?.runtime;
  if (!runtime) return "";
  let sequence = 1;
  try {
    const state = await pb.collection("sync_runtime_state").getFirstListItem('key = "temporary-ficha-sequence"', { requestKey: null });
    sequence = Number(state.value?.sequence || 0) + 1;
    await pb.collection("sync_runtime_state").update(state.id, { value: { sequence } }, { requestKey: null });
  } catch (error) {
    if (!error || typeof error !== "object" || !("status" in error) || error.status !== 404) throw error;
    await pb.collection("sync_runtime_state").create({ key: "temporary-ficha-sequence", value: { sequence } }, { requestKey: null });
  }
  return createTemporaryFicha(runtime.deviceCode, sequence);
}
