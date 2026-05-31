const REFRACTION_VALUE_FIELDS = [
  "ref_lejos_od_esf",
  "ref_lejos_od_cil",
  "ref_lejos_oi_esf",
  "ref_lejos_oi_cil",
  "ref_cerca_od_esf",
  "ref_cerca_od_cil",
  "ref_cerca_oi_esf",
  "ref_cerca_oi_cil",
  "add_value",
] as const;

export function hasMeaningfulRefractionValue(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return false;

  const normalized = raw.replace(",", ".").replace(/\s+/g, "");
  const numeric = Number(normalized);

  if (Number.isFinite(numeric)) {
    return Math.abs(numeric) > 0;
  }

  return !/^[+-]?0+(?:[.,]0+)?$/.test(normalized);
}

export function refractionHasValues(record: Record<string, unknown>) {
  return REFRACTION_VALUE_FIELDS.some((field) => hasMeaningfulRefractionValue(record[field]));
}
