export const DESKTOP_SYNC_CONTINUATION_DELAY_MS = 250;

interface TimerApi {
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
  clearTimeout(handle: ReturnType<typeof setTimeout>): void;
}

const defaultTimerApi: TimerApi = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle),
};

export function createSyncContinuationScheduler(
  task: () => Promise<unknown>,
  delayMs = DESKTOP_SYNC_CONTINUATION_DELAY_MS,
  timers: TimerApi = defaultTimerApi,
) {
  let handle: ReturnType<typeof setTimeout> | null = null;
  let paused = false;

  const cancel = () => {
    if (handle === null) return;
    timers.clearTimeout(handle);
    handle = null;
  };

  return {
    schedule() {
      if (paused || handle !== null) return false;
      handle = timers.setTimeout(() => {
        handle = null;
        if (!paused) void task().catch(() => undefined);
      }, delayMs);
      return true;
    },
    cancel,
    pause() {
      paused = true;
      cancel();
    },
    resume() {
      paused = false;
    },
    isScheduled() {
      return handle !== null;
    },
  };
}
