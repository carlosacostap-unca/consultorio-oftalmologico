export const CONSULTA_EDIT_LIMIT_DAYS_KEY = "consulta_edit_limit_days";
export const DEFAULT_CONSULTA_EDIT_LIMIT_DAYS = 7;

export interface SystemSettings {
  consultaEditLimitDays: number;
}

export function normalizeConsultaEditLimitDays(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return DEFAULT_CONSULTA_EDIT_LIMIT_DAYS;
  }

  return Math.floor(numberValue);
}
