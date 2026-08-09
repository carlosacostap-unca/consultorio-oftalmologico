const TEMPORARY_FICHA_PATTERN = /^TEMP-[A-Z0-9]{1,8}-\d{5,}$/;

export function isTemporaryFicha(value: unknown): value is string {
  return typeof value === "string" && TEMPORARY_FICHA_PATTERN.test(value.trim().toUpperCase());
}

export function fichaDisplayLabel(value: unknown): string {
  const ficha = typeof value === "string" ? value.trim() : "";
  if (!ficha) return "Sin ficha";
  return isTemporaryFicha(ficha) ? `Ficha provisoria ${ficha}` : `Ficha ${ficha}`;
}
