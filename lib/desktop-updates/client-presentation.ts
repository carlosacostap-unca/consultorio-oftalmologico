import type { DesktopUpdateClientState } from "@/lib/desktop-runtime";

export function desktopUpdateSummary(state: DesktopUpdateClientState): string {
  const version = state.version ? ` ${state.version}` : "";

  if (state.code === "configuration_required") return "Configurá la conexión central para buscar actualizaciones";
  if (state.code === "auth_required") return "Volvé a iniciar sesión para buscar actualizaciones";
  if (state.code === "up_to_date") return "La aplicación está actualizada";
  if (state.status === "checking") return "Buscando actualizaciones";
  if (state.status === "available") return `Actualización${version} disponible`;
  if (state.status === "mandatory") return `Actualización obligatoria${version}`;
  if (state.status === "downloading") return `Descargando${version}: ${state.percent ?? 0}%`;
  if (state.status === "ready") return `${state.kind === "mandatory" ? "Actualización obligatoria" : "Actualización"}${version} lista`;
  if (state.status === "postponed") return `Actualización${version} pospuesta`;
  if (state.status === "error") {
    return state.kind === "mandatory"
      ? `Actualización obligatoria${version} pendiente`
      : "No se pudo buscar la actualización";
  }
  return "Buscar actualizaciones";
}
