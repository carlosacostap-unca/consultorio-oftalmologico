import type { SyncEntity, SyncStatusSnapshot } from "./types";

const entityLabels: Record<SyncEntity, string> = {
  pacientes: "pacientes",
  consultas: "consultas",
  recetas: "recetas",
};

export interface SyncStatusPresentation {
  active: boolean;
  label: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "gray";
}

export function presentSyncStatus(status: SyncStatusSnapshot): SyncStatusPresentation {
  const entity = status.currentEntity ? entityLabels[status.currentEntity] : "datos clínicos";
  const count = new Intl.NumberFormat("es-AR").format(status.recordsProcessed || 0);

  if (status.phase === "pushing") {
    return { active: true, label: "Enviando cambios pendientes", detail: "Los cambios locales se confirman antes de descargar novedades.", tone: "blue" };
  }
  if (status.phase === "pulling") {
    return { active: true, label: `Descargando ${entity}`, detail: `${count} registros aplicados en este tramo.`, tone: "blue" };
  }
  if (status.phase === "continuation_required") {
    return { active: true, label: `Descargando ${entity}`, detail: `${count} registros aplicados en este tramo. La descarga continuará automáticamente.`, tone: "blue" };
  }
  if (status.phase === "caught_up") {
    return { active: false, label: "Sincronizado", detail: "La copia local está actualizada.", tone: "green" };
  }
  if (status.phase === "error") {
    return { active: false, label: "Sincronización detenida", detail: status.lastError || "Se necesita reintentar la sincronización.", tone: "amber" };
  }
  if (status.pending > 0) {
    return { active: false, label: `${status.pending} cambio${status.pending === 1 ? "" : "s"} pendiente${status.pending === 1 ? "" : "s"}`, detail: "Se enviará al recuperar conexión.", tone: "blue" };
  }
  if (status.connectivity === "offline") {
    return { active: false, label: "Sin conexión", detail: "La copia local sigue disponible.", tone: "gray" };
  }
  return { active: false, label: "Comprobando sincronización", detail: "Todavía no hay una sincronización completa registrada.", tone: "gray" };
}
