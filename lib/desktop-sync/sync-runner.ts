import type { SyncCursor, SyncEntity, SyncPullPage, SyncRecord } from "./types";

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
  fetchPage: (entity: SyncEntity) => Promise<SyncPullPage>,
  applyRecord: (entity: SyncEntity, record: SyncRecord) => Promise<void>,
  saveCursor: (cursor: SyncCursor) => Promise<void>,
): Promise<void> {
  if (!Number.isSafeInteger(maximumPages) || maximumPages <= 0) {
    throw new Error("El límite de páginas debe ser un entero positivo.");
  }

  for (const entity of entities) {
    let completed = false;
    for (let pageNumber = 0; pageNumber < maximumPages; pageNumber += 1) {
      const page = await fetchPage(entity);
      if (page.entity !== entity) throw new Error(`La página recibida no corresponde a ${entity}.`);
      for (const record of page.records) await applyRecord(entity, record);
      if (page.cursor) await saveCursor(page.cursor);
      if (!page.hasMore) {
        completed = true;
        break;
      }
    }
    if (!completed) throw new Error(`La descarga incremental de ${entity} excedió el límite seguro de páginas.`);
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
