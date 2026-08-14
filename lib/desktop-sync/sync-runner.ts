import type { SyncCursor, SyncEntity, SyncPullPage, SyncRecord } from "./types";

export const DESKTOP_PULL_PAGE_SIZE = 200;
export const DESKTOP_PULL_MAX_PAGES_PER_SLICE = 100;

export interface PullSliceProgress {
  entity: SyncEntity;
  pagesProcessed: number;
  recordsProcessed: number;
}

export interface PullSliceResult extends PullSliceProgress {
  complete: boolean;
}

export function createSingleFlightRunner<TResult>(task: () => Promise<TResult>): () => Promise<TResult> {
  let running: Promise<TResult> | null = null;

  return () => {
    if (running) return running;
    const current = Promise.resolve().then(task);
    running = current;
    const clear = () => {
      if (running === current) running = null;
    };
    current.then(clear, clear);
    return current;
  };
}

export async function processPullEntities(
  entities: readonly SyncEntity[],
  maximumPages: number,
  initialCursors: Partial<Record<SyncEntity, SyncCursor>>,
  fetchPage: (entity: SyncEntity, cursor: SyncCursor | null) => Promise<SyncPullPage>,
  applyRecord: (entity: SyncEntity, record: SyncRecord) => Promise<void>,
  saveCursor: (cursor: SyncCursor) => Promise<void>,
  onProgress?: (progress: PullSliceProgress) => Promise<void>,
): Promise<PullSliceResult> {
  if (!Number.isSafeInteger(maximumPages) || maximumPages <= 0) {
    throw new Error("El límite de páginas debe ser un entero positivo.");
  }

  let pagesProcessed = 0;
  let recordsProcessed = 0;

  for (const entity of entities) {
    let cursor = initialCursors[entity] || null;
    for (let pageNumber = 0; pageNumber < maximumPages; pageNumber += 1) {
      const page = await fetchPage(entity, cursor);
      validatePullPage(entity, cursor, page);
      for (const record of page.records) await applyRecord(entity, record);
      if (page.cursor && (!cursor || isCursorAfter(page.cursor, cursor))) {
        await saveCursor(page.cursor);
        cursor = page.cursor;
      }
      pagesProcessed += 1;
      recordsProcessed += page.records.length;
      await onProgress?.({ entity, pagesProcessed, recordsProcessed });
      if (!page.hasMore) {
        break;
      }
      if (pageNumber === maximumPages - 1) {
        return { complete: false, entity, pagesProcessed, recordsProcessed };
      }
    }
  }

  return {
    complete: true,
    entity: entities.at(-1) || "pacientes",
    pagesProcessed,
    recordsProcessed,
  };
}

export function isCursorAfter(next: SyncCursor, previous: SyncCursor): boolean {
  if (next.entity !== previous.entity) return false;
  if (next.updated !== previous.updated) return next.updated > previous.updated;
  return next.id > previous.id;
}

function validatePullPage(entity: SyncEntity, previous: SyncCursor | null, page: SyncPullPage) {
  if (page.entity !== entity) throw new Error(`La página recibida no corresponde a ${entity}.`);
  if (!Array.isArray(page.records)) throw new Error(`La página de ${entity} no contiene una lista de registros válida.`);
  if (page.hasMore && page.records.length === 0) {
    throw new Error(`La página de ${entity} indica más resultados pero no contiene registros.`);
  }
  if (page.records.length > 0 && !page.cursor) {
    throw new Error(`La página de ${entity} contiene registros pero no devolvió un cursor.`);
  }
  if (page.cursor && page.cursor.entity !== entity) {
    throw new Error(`El cursor recibido no corresponde a ${entity}.`);
  }
  if (page.cursor && (
    typeof page.cursor.updated !== "string"
    || typeof page.cursor.id !== "string"
    || !page.cursor.updated.trim()
    || !page.cursor.id.trim()
  )) {
    throw new Error(`El cursor recibido para ${entity} está incompleto.`);
  }
  if (previous && page.records.length > 0 && page.cursor && !isCursorAfter(page.cursor, previous)) {
    throw new Error(`El cursor recibido para ${entity} no avanzó respecto del cursor solicitado.`);
  }
}

export async function processInBatches<TItem, TResult>(
  items: readonly TItem[],
  batchSize: number,
  executeBatch: (batch: TItem[]) => Promise<TResult>,
  applyResult: (result: TResult, batch: TItem[]) => Promise<void>,
  onInterrupted?: (error: unknown, batch: TItem[]) => Promise<void>,
): Promise<void> {
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error("El tamaño de lote debe ser un entero positivo.");
  }

  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    try {
      const result = await executeBatch(batch);
      await applyResult(result, batch);
    } catch (error) {
      await onInterrupted?.(error, batch);
      throw error;
    }
  }
}
