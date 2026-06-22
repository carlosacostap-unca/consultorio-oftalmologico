export function normalizePatientDocumentInput(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits || trimmed;
}

export async function findDuplicatePatientDocumentClient(documento: string, excludeId = "") {
  const normalized = normalizePatientDocumentInput(documento);
  if (!normalized) {
    return null;
  }

  const params = new URLSearchParams({ documento: normalized });
  if (excludeId) {
    params.set("exclude_id", excludeId);
  }

  const response = await fetch(`/api/pacientes/documento?${params}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  return data.exists ? data.duplicate : null;
}

export function duplicatePatientDocumentMessage(documento: string, duplicate: { nombre?: string; apellido?: string; numero_ficha?: string } | null | undefined) {
  const ficha = duplicate?.numero_ficha ? ` (ficha ${duplicate.numero_ficha})` : "";
  return `El DNI ${documento} ya esta asignado a ${duplicate?.apellido || ""}, ${duplicate?.nombre || ""}${ficha}. No se puede guardar otra ficha con el mismo DNI.`;
}
