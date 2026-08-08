export const FIXED_CLINICAL_ANTECEDENT_KEYS = [
  "ant_diabetes",
  "ant_glaucoma",
  "ant_maculopatia",
  "ant_asmatico",
  "ant_hipertension",
  "ant_alergico",
  "ant_reuma",
  "ant_herpes",
] as const;

export type FixedClinicalAntecedentKey = (typeof FIXED_CLINICAL_ANTECEDENT_KEYS)[number];

export type ClinicalAntecedentsSource = Partial<
  Record<FixedClinicalAntecedentKey, boolean | null | undefined>
> & {
  ant_otra?: string | null;
};

export type ClinicalAntecedents = Record<FixedClinicalAntecedentKey, boolean> & {
  ant_otra: string;
};

export function mergeClinicalAntecedents(
  consulta: ClinicalAntecedentsSource,
  paciente?: ClinicalAntecedentsSource | null,
): ClinicalAntecedents {
  const merged = Object.fromEntries(
    FIXED_CLINICAL_ANTECEDENT_KEYS.map((key) => [key, Boolean(consulta[key]) || Boolean(paciente?.[key])]),
  ) as Record<FixedClinicalAntecedentKey, boolean>;
  const consultaOtra = String(consulta.ant_otra || "");
  const pacienteOtra = String(paciente?.ant_otra || "");

  return {
    ...merged,
    ant_otra: consultaOtra.trim() ? consultaOtra : pacienteOtra,
  };
}
