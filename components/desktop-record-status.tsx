import type { VisibleSyncRecordStatus } from "@/lib/desktop-record-status";
import { fichaDisplayLabel, isTemporaryFicha } from "@/lib/temporary-ficha";

const STATUS_PRESENTATION: Record<VisibleSyncRecordStatus, { label: string; className: string }> = {
  pending: {
    label: "Pendiente de sincronización",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
  },
  error: {
    label: "Error de sincronización",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
  },
  conflict: {
    label: "Conflicto pendiente",
    className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
  },
};

export function RecordSyncStatusBadge({ status }: { status?: VisibleSyncRecordStatus }) {
  if (!status) return null;
  const presentation = STATUS_PRESENTATION[status];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${presentation.className}`}>
      {presentation.label}
    </span>
  );
}

export function FichaDisplay({ value, compact = false }: { value?: string | null; compact?: boolean }) {
  if (!value) return <span>Sin ficha</span>;
  if (!isTemporaryFicha(value)) return <span>{compact ? value : `Ficha ${value}`}</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
        Ficha provisoria
      </span>
      <span className="font-mono text-xs">{value}</span>
    </span>
  );
}

export function PrintableSyncNotice({
  status,
  ficha,
}: {
  status?: VisibleSyncRecordStatus;
  ficha?: string | null;
}) {
  const temporary = isTemporaryFicha(ficha);
  if (!status && !temporary) return null;

  return (
    <aside className="mt-4 border border-dashed border-gray-500 px-3 py-2 text-xs text-gray-700">
      {temporary && <div>{fichaDisplayLabel(ficha)} · pendiente de asignación central.</div>}
      {status && <div>{STATUS_PRESENTATION[status].label}. Este documento fue generado con la copia local disponible.</div>}
    </aside>
  );
}
