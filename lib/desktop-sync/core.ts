import { randomBytes } from "node:crypto";
import type { SyncOperation, SyncRecord } from "./types";
export { isTemporaryFicha } from "../temporary-ficha.ts";

const POCKETBASE_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const DEFAULT_IGNORED_FIELDS = new Set(["id", "collectionId", "collectionName", "created", "updated", "expand"]);
const ENTITY_PRIORITY = { pacientes: 0, consultas: 1, recetas: 2 } as const;

export function createPocketBaseId(): string {
  const bytes = randomBytes(15);
  let id = "";

  for (const byte of bytes) {
    id += POCKETBASE_ID_ALPHABET[byte % POCKETBASE_ID_ALPHABET.length];
  }

  return id;
}

export function normalizeDeviceCode(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);

  if (!normalized) throw new Error("El código de equipo debe contener letras o números");
  return normalized;
}

export function createTemporaryFicha(deviceCode: string, sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new Error("La secuencia de ficha provisoria debe ser un entero positivo");
  }

  return `TEMP-${normalizeDeviceCode(deviceCode)}-${String(sequence).padStart(5, "0")}`;
}

export function changedFields(
  base: SyncRecord | null | undefined,
  next: SyncRecord | null | undefined,
  ignoredFields: ReadonlySet<string> = DEFAULT_IGNORED_FIELDS,
): string[] {
  const before = base ?? {};
  const after = next ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...keys]
    .filter((key) => !ignoredFields.has(key))
    .filter((key) => !deepEqual(before[key], after[key]))
    .sort();
}

export function conflictingFields(
  base: SyncRecord | null | undefined,
  local: SyncRecord,
  central: SyncRecord,
): string[] {
  const localChanges = new Set(changedFields(base, local));
  return changedFields(base, central).filter((field) => localChanges.has(field));
}

export function mergeDisjointPatientChanges(
  base: SyncRecord | null | undefined,
  local: SyncRecord,
  central: SyncRecord,
): { merged: SyncRecord; conflicts: string[]; localChanges: string[]; centralChanges: string[] } {
  const localChanges = changedFields(base, local);
  const centralChanges = changedFields(base, central);
  const centralSet = new Set(centralChanges);
  const conflicts = localChanges.filter((field) => centralSet.has(field));
  const merged = { ...central };

  if (conflicts.length === 0) {
    for (const field of localChanges) merged[field] = local[field];
  }

  return { merged, conflicts, localChanges, centralChanges };
}

export function sameBaseVersion(baseUpdated: string | null | undefined, centralUpdated: string | null | undefined): boolean {
  return Boolean(baseUpdated && centralUpdated && baseUpdated === centralUpdated);
}

export function sortOperationsByDependencies(operations: readonly SyncOperation[]): SyncOperation[] {
  const byId = new Map(operations.map((operation) => [operation.operationId, operation]));
  const remaining = new Set(byId.keys());
  const result: SyncOperation[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining]
      .map((id) => byId.get(id)!)
      .filter((operation) => (operation.dependsOn ?? []).every((id) => !remaining.has(id)))
      .sort(compareOperations);

    if (ready.length === 0) {
      const cycle = [...remaining].sort().join(", ");
      throw new Error(`Dependencias cíclicas o ausentes en operaciones: ${cycle}`);
    }

    for (const operation of ready) {
      result.push(operation);
      remaining.delete(operation.operationId);
    }
  }

  return result;
}

export function retryDelayMs(attempts: number, baseMs = 1_000, maximumMs = 60_000): number {
  const safeAttempts = Math.max(0, Math.floor(attempts));
  return Math.min(maximumMs, baseMs * 2 ** safeAttempts);
}

export function sanitizeSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Error desconocido");
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/(password|passwordConfirm|token|secret)\s*[:=]\s*[^\s,;}]+/gi, "$1=[REDACTED]")
    .slice(0, 1_000);
}

function compareOperations(left: SyncOperation, right: SyncOperation): number {
  const priority = ENTITY_PRIORITY[left.entity] - ENTITY_PRIORITY[right.entity];
  if (priority !== 0) return priority;

  const date = left.localCreatedAt.localeCompare(right.localCreatedAt);
  if (date !== 0) return date;
  return left.operationId.localeCompare(right.operationId);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => deepEqual(value, right[index]));
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  if (!deepEqual(leftKeys, rightKeys)) return false;

  return leftKeys.every((key) => deepEqual(leftRecord[key], rightRecord[key]));
}
