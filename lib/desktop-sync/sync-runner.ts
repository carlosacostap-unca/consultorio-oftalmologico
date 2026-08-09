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
