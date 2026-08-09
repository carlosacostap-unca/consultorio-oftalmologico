export async function forEachWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("La concurrencia debe ser un entero positivo.");
  }

  let nextIndex = 0;
  let failure: unknown;
  const runnerCount = Math.min(concurrency, items.length);

  async function run() {
    while (failure === undefined) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      try {
        await worker(items[index], index);
      } catch (error) {
        failure = error;
      }
    }
  }

  await Promise.all(Array.from({ length: runnerCount }, () => run()));
  if (failure !== undefined) throw failure;
}
