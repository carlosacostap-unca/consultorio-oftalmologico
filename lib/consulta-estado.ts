export const CONSULTA_ESTADOS = ["borrador", "en_curso", "finalizada", "anulada"] as const;

export type ConsultaEstado = (typeof CONSULTA_ESTADOS)[number];

export const DEFAULT_CONSULTA_ESTADO: ConsultaEstado = "finalizada";

export function normalizeConsultaEstado(value?: string | null): ConsultaEstado {
  if (value && CONSULTA_ESTADOS.includes(value as ConsultaEstado)) {
    return value as ConsultaEstado;
  }

  return DEFAULT_CONSULTA_ESTADO;
}

export function consultaEstadoLabel(value?: string | null) {
  switch (normalizeConsultaEstado(value)) {
    case "borrador":
      return "Borrador";
    case "en_curso":
      return "En curso";
    case "finalizada":
      return "Finalizada";
    case "anulada":
      return "Anulada";
  }
}

export function consultaEstadoBadgeClass(value?: string | null) {
  switch (normalizeConsultaEstado(value)) {
    case "borrador":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
    case "en_curso":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200";
    case "finalizada":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "anulada":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";
  }
}
