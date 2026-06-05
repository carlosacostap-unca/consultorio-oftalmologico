const OPTIONAL_ZERO_FIELDS = [
  "av_sc_od",
  "av_sc_oi",
  "av_cc_od",
  "av_cc_oi",
  "ref_lejos_od_esf",
  "ref_lejos_od_cil",
  "ref_lejos_od_eje",
  "ref_lejos_oi_esf",
  "ref_lejos_oi_cil",
  "ref_lejos_oi_eje",
  "add_value",
  "ref_cerca_od_esf",
  "ref_cerca_od_cil",
  "ref_cerca_od_eje",
  "ref_cerca_oi_esf",
  "ref_cerca_oi_cil",
  "ref_cerca_oi_eje",
  "pio_od",
  "pio_oi",
] as const;

const OPTIONAL_ZERO_FIELD_SET = new Set<string>(OPTIONAL_ZERO_FIELDS);

export function emptyIfOptionalClinicalZero(field: string, value: unknown) {
  if (!OPTIONAL_ZERO_FIELD_SET.has(field)) return value;

  const normalized = String(value ?? "").trim().replace(",", ".").replace(/\s+/g, "");
  if (!normalized) return "";

  return /^[+-]?0+(?:\.0+)?$/.test(normalized) ? "" : value;
}

export function normalizeOptionalClinicalZeros<T extends Record<string, unknown>>(record: T): T {
  const normalized = { ...record };

  for (const field of OPTIONAL_ZERO_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(normalized, field)) {
      normalized[field as keyof T] = emptyIfOptionalClinicalZero(field, normalized[field]) as T[keyof T];
    }
  }

  return normalized;
}
