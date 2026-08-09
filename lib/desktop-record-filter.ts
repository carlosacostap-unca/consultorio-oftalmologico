export const DESKTOP_ACTIVE_RECORD_FILTER = "sync_deleted != true";

export function buildActiveRecordFilter(baseFilter: string, desktopRuntime: boolean): string {
  const filters = [baseFilter.trim()];
  if (desktopRuntime) filters.push(DESKTOP_ACTIVE_RECORD_FILTER);
  return filters.filter(Boolean).join(" && ");
}
