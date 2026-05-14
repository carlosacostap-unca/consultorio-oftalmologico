"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import type { AppUser } from "@/lib/types";
import { resolveActiveRole } from "@/lib/active-role";
import type { AppointmentLike, BlockScope, ScheduleBlock } from "@/lib/agenda-recurrente";
import { dateKey, findConflictingAppointments } from "@/lib/agenda-recurrente";
import { formatDate } from "@/lib/utils";

interface Medico {
  id: string;
  name?: string;
  email?: string;
}

interface TurnoRecord extends AppointmentLike {
  paciente_id?: string;
  motivo?: string;
  estado?: string;
  expand?: {
    paciente_id?: {
      nombre?: string;
      apellido?: string;
      numero_documento?: string;
      dni?: string;
    };
    medico_id?: Medico;
  };
}

const initialForm = {
  alcance: "medico" as BlockScope,
  medico_id: "",
  fecha_inicio: dateKey(new Date()),
  fecha_fin: dateKey(new Date()),
  hora_inicio: "08:00",
  hora_fin: "12:30",
  dia_completo: false,
  motivo: "",
};

export default function BloqueosAgendaPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [turnos, setTurnos] = useState<TurnoRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const activeRole = resolveActiveRole(user, ["secretaria"]);
  const canManageAll = activeRole === "admin" || activeRole === "secretaria";
  const isDoctorRole = activeRole === "medico";

  useEffect(() => {
    setIsMounted(true);
    const record = pb.authStore.record as AppUser | null;
    setUser(record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    if (resolveActiveRole(record, ["secretaria"]) === "medico" && record?.id) {
      setForm((prev) => ({ ...prev, alcance: "medico", medico_id: record.id || "" }));
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [medicosResponse, blocksResponse, turnosResponse] = await Promise.all([
        fetch("/api/medicos", { headers: { Authorization: `Bearer ${pb.authStore.token}` } }),
        pb.collection("bloqueos_agenda").getFullList<ScheduleBlock>({
          sort: "-fecha_inicio,-created",
          requestKey: null,
        }),
        pb.collection("turnos").getFullList<TurnoRecord>({
          sort: "fecha_hora",
          expand: "paciente_id,medico_id",
          requestKey: null,
        }),
      ]);

      if (!medicosResponse.ok) throw new Error("No se pudieron cargar los medicos.");
      const medicosData = await medicosResponse.json();
      const medicosRecords = Array.isArray(medicosData.medicos) ? medicosData.medicos : [];
      setMedicos(medicosRecords);
      setBlocks(blocksResponse);
      setTurnos(turnosResponse);

      if (!form.medico_id && medicosRecords[0]?.id) {
        setForm((prev) => ({ ...prev, medico_id: prev.medico_id || medicosRecords[0].id }));
      }
    } catch (err) {
      console.error("Error al cargar bloqueos:", err);
      setError("No se pudieron cargar los bloqueos.");
    } finally {
      setIsLoading(false);
    }
  };

  const previewBlock: ScheduleBlock = {
    id: editingId || "preview",
    alcance: form.alcance,
    medico_id: form.alcance === "medico" ? form.medico_id : "",
    fecha_inicio: form.fecha_inicio,
    fecha_fin: form.fecha_fin,
    hora_inicio: form.dia_completo ? "" : form.hora_inicio,
    hora_fin: form.dia_completo ? "" : form.hora_fin,
    dia_completo: form.dia_completo,
    motivo: form.motivo,
  };
  const previewConflicts = useMemo(() => findConflictingAppointments(turnos, [previewBlock]), [turnos, form, editingId]);
  const currentConflicts = useMemo(() => findConflictingAppointments(turnos, blocks), [turnos, blocks]);

  const doctorLabel = (doctor?: Medico | null) => doctor?.name || doctor?.email || "Medico";
  const patientLabel = (turno: TurnoRecord) => {
    const patient = turno.expand?.paciente_id;
    if (!patient) return "Paciente no encontrado";
    const document = patient.numero_documento || patient.dni || "";
    return `${patient.apellido || ""}, ${patient.nombre || ""}${document ? ` - DNI ${document}` : ""}`;
  };

  const resetForm = () => {
    setEditingId("");
    setForm((prev) => ({
      ...initialForm,
      alcance: isDoctorRole ? "medico" : "medico",
      medico_id: isDoctorRole ? user?.id || "" : prev.medico_id || medicos[0]?.id || "",
    }));
  };

  const editBlock = (block: ScheduleBlock) => {
    if (isDoctorRole && block.medico_id !== user?.id) {
      setError("Solo podes editar bloqueos de tu propia agenda.");
      return;
    }

    setEditingId(block.id);
    setForm({
      alcance: block.alcance,
      medico_id: block.medico_id || user?.id || "",
      fecha_inicio: dateKey(new Date(block.fecha_inicio)),
      fecha_fin: dateKey(new Date(block.fecha_fin)),
      hora_inicio: block.hora_inicio || "08:00",
      hora_fin: block.hora_fin || "12:30",
      dia_completo: Boolean(block.dia_completo),
      motivo: block.motivo || "",
    });
  };

  const saveBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (isDoctorRole && form.medico_id !== user?.id) {
      setError("Solo podes bloquear tu propia agenda.");
      return;
    }

    if (form.alcance === "medico" && !form.medico_id) {
      setError("Selecciona un medico.");
      return;
    }

    setIsSaving(true);
    const payload = {
      alcance: isDoctorRole ? "medico" : form.alcance,
      medico_id: form.alcance === "medico" || isDoctorRole ? form.medico_id : null,
      fecha_inicio: new Date(`${form.fecha_inicio}T00:00:00`).toISOString(),
      fecha_fin: new Date(`${form.fecha_fin}T23:59:59`).toISOString(),
      hora_inicio: form.dia_completo ? "" : form.hora_inicio,
      hora_fin: form.dia_completo ? "" : form.hora_fin,
      dia_completo: form.dia_completo,
      motivo: form.motivo.trim(),
      creado_por: user?.id || null,
    };

    try {
      if (editingId) {
        await pb.collection("bloqueos_agenda").update(editingId, payload);
      } else {
        await pb.collection("bloqueos_agenda").create(payload);
      }
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Error al guardar bloqueo:", err);
      setError("No se pudo guardar el bloqueo.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBlock = async (block: ScheduleBlock) => {
    if (isDoctorRole && block.medico_id !== user?.id) {
      setError("Solo podes eliminar bloqueos de tu propia agenda.");
      return;
    }

    if (!window.confirm("Eliminar este bloqueo?")) return;

    try {
      await pb.collection("bloqueos_agenda").delete(block.id);
      await loadData();
    } catch (err) {
      console.error("Error al eliminar bloqueo:", err);
      setError("No se pudo eliminar el bloqueo.");
    }
  };

  if (!isMounted || !user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="rounded-lg border border-zinc-200 bg-white p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Bloqueos y feriados</h1>
              <p className="text-zinc-500 dark:text-zinc-400">Registra excepciones de agenda y detecta turnos en conflicto</p>
            </div>
          </div>
          {canManageAll && (
            <Link href="/horarios-medicos" className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
              Horarios medicos
            </Link>
          )}
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div>}

        {currentConflicts.length > 0 && (
          <section aria-label="Turnos a resolver" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Turnos a resolver</p>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Turnos afectados por bloqueos</h2>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">{currentConflicts.length}</span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {currentConflicts.slice(0, 8).map(({ appointment, block, start }) => (
                <article key={`${appointment.id}-${block.id}`} className="rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-zinc-950">
                  <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">{formatDate(start)} {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  <h3 className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">{patientLabel(appointment as TurnoRecord)}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{appointment.tipo || "Turno"} - {block.motivo || "Bloqueo de agenda"}</p>
                  <Link href={`/turnos/${appointment.id}`} className="mt-3 inline-flex rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">Gestionar turno</Link>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{editingId ? "Editar bloqueo" : "Nuevo bloqueo"}</h2>
            <form onSubmit={saveBlock} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Alcance
                <select
                  value={isDoctorRole ? "medico" : form.alcance}
                  onChange={(event) => setForm((prev) => ({ ...prev, alcance: event.target.value as BlockScope }))}
                  disabled={isDoctorRole}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="medico">Medico</option>
                  {canManageAll && <option value="general">General del consultorio</option>}
                </select>
              </label>

              {(form.alcance === "medico" || isDoctorRole) && (
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Medico
                  <select
                    value={isDoctorRole ? user.id || "" : form.medico_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, medico_id: event.target.value }))}
                    disabled={isDoctorRole}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">Seleccione medico</option>
                    {medicos.map((medico) => <option key={medico.id} value={medico.id}>{doctorLabel(medico)}</option>)}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Desde
                  <input type="date" value={form.fecha_inicio} onChange={(event) => setForm((prev) => ({ ...prev, fecha_inicio: event.target.value, fecha_fin: prev.fecha_fin || event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:[color-scheme:dark]" />
                </label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Hasta
                  <input type="date" value={form.fecha_fin} onChange={(event) => setForm((prev) => ({ ...prev, fecha_fin: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:[color-scheme:dark]" />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" checked={form.dia_completo} onChange={(event) => setForm((prev) => ({ ...prev, dia_completo: event.target.checked }))} className="h-4 w-4" />
                Dia completo
              </label>

              {!form.dia_completo && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Hora inicio
                    <input type="time" value={form.hora_inicio} onChange={(event) => setForm((prev) => ({ ...prev, hora_inicio: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:[color-scheme:dark]" />
                  </label>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Hora fin
                    <input type="time" value={form.hora_fin} onChange={(event) => setForm((prev) => ({ ...prev, hora_fin: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:[color-scheme:dark]" />
                  </label>
                </div>
              )}

              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Motivo
                <textarea value={form.motivo} onChange={(event) => setForm((prev) => ({ ...prev, motivo: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
              </label>

              {previewConflicts.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  Este bloqueo afectara {previewConflicts.length} turno{previewConflicts.length === 1 ? "" : "s"} ya otorgado{previewConflicts.length === 1 ? "" : "s"}.
                </div>
              )}

              <div className="flex justify-end gap-2">
                {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancelar</button>}
                <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {isSaving ? "Guardando..." : "Guardar bloqueo"}
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Bloqueos cargados</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Los bloqueos generales aplican a todos los medicos y tipos de atencion.</p>
            </div>
            {isLoading ? (
              <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Cargando bloqueos...</div>
            ) : blocks.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Todavia no hay bloqueos cargados.</div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {blocks.map((block) => {
                  const medico = medicos.find((item) => item.id === block.medico_id);
                  return (
                    <article key={block.id} className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {block.alcance === "general" ? "General" : doctorLabel(medico)}
                            </span>
                            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              {formatDate(block.fecha_inicio)} - {formatDate(block.fecha_fin)}
                            </span>
                          </div>
                          <div className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                            {block.dia_completo ? "Dia completo" : `${block.hora_inicio || "--:--"} - ${block.hora_fin || "--:--"}`}
                          </div>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{block.motivo || "Sin motivo cargado"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => editBlock(block)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Editar</button>
                          <button onClick={() => deleteBlock(block)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">Eliminar</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
