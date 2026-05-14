"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import type { AppUser } from "@/lib/types";
import { resolveActiveRole } from "@/lib/active-role";
import type { AppointmentType, WeeklyScheduleRule } from "@/lib/agenda-recurrente";

interface Medico {
  id: string;
  name?: string;
  email?: string;
}

const DAY_OPTIONS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sabado" },
  { value: 0, label: "Domingo" },
];

const TYPE_OPTIONS: AppointmentType[] = ["Consulta", "Estudio", "Cirugia"];

const initialForm = {
  medico_id: "",
  dia_semana: "1",
  hora_inicio: "08:00",
  hora_fin: "12:30",
  tipo: "Consulta" as AppointmentType,
  duracion_minutos: "15",
  activo: true,
};

export default function HorariosMedicosPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [rules, setRules] = useState<WeeklyScheduleRule[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const activeRole = resolveActiveRole(user, ["secretaria"]);
  const canManage = activeRole === "admin" || activeRole === "secretaria";

  useEffect(() => {
    setIsMounted(true);
    const record = pb.authStore.record as AppUser | null;
    setUser(record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [medicosResponse, rulesResponse] = await Promise.all([
        fetch("/api/medicos", { headers: { Authorization: `Bearer ${pb.authStore.token}` } }),
        pb.collection("agenda_semanal_medico").getFullList<WeeklyScheduleRule>({
          sort: "medico_id,dia_semana,hora_inicio",
          requestKey: null,
        }),
      ]);

      if (!medicosResponse.ok) throw new Error("No se pudieron cargar los medicos.");
      const medicosData = await medicosResponse.json();
      const medicosRecords = Array.isArray(medicosData.medicos) ? medicosData.medicos : [];
      setMedicos(medicosRecords);
      setRules(rulesResponse);

      if (!form.medico_id && medicosRecords[0]?.id) {
        setForm((prev) => ({ ...prev, medico_id: medicosRecords[0].id }));
      }
    } catch (err) {
      console.error("Error al cargar horarios medicos:", err);
      setError("No se pudieron cargar los horarios medicos.");
    } finally {
      setIsLoading(false);
    }
  };

  const doctorLabel = (doctor?: Medico | null) => doctor?.name || doctor?.email || "Medico";
  const dayLabel = (value: number) => DAY_OPTIONS.find((day) => day.value === Number(value))?.label || "-";
  const typeLabel = (value?: string) => value === "Cirugia" ? "Cirugia" : value || "-";

  const resetForm = () => {
    setEditingId("");
    setForm((prev) => ({ ...initialForm, medico_id: prev.medico_id || medicos[0]?.id || "" }));
  };

  const editRule = (rule: WeeklyScheduleRule) => {
    setEditingId(rule.id);
    setForm({
      medico_id: rule.medico_id,
      dia_semana: String(rule.dia_semana),
      hora_inicio: rule.hora_inicio,
      hora_fin: rule.hora_fin,
      tipo: rule.tipo,
      duracion_minutos: String(rule.duracion_minutos || 15),
      activo: rule.activo !== false,
    });
  };

  const saveRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) {
      setError("No tenes permisos para administrar horarios medicos.");
      return;
    }

    if (!form.medico_id) {
      setError("Selecciona un medico.");
      return;
    }

    setIsSaving(true);
    setError("");
    const payload = {
      medico_id: form.medico_id,
      dia_semana: Number(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      tipo: form.tipo,
      duracion_minutos: Math.max(Number(form.duracion_minutos) || 15, 1),
      activo: form.activo,
    };

    try {
      if (editingId) {
        await pb.collection("agenda_semanal_medico").update(editingId, payload);
      } else {
        await pb.collection("agenda_semanal_medico").create(payload);
      }
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Error al guardar horario medico:", err);
      setError("No se pudo guardar el horario medico.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRule = async (rule: WeeklyScheduleRule) => {
    try {
      await pb.collection("agenda_semanal_medico").update(rule.id, { activo: rule.activo === false });
      await loadData();
    } catch (err) {
      console.error("Error al cambiar estado del horario:", err);
      setError("No se pudo actualizar el horario.");
    }
  };

  if (!isMounted || !user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-zinc-200 bg-white p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Horarios medicos</h1>
              <p className="text-zinc-500 dark:text-zinc-400">Configura reglas semanales recurrentes por medico</p>
            </div>
          </div>
          <Link href="/bloqueos-agenda" className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
            Bloqueos y feriados
          </Link>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{editingId ? "Editar horario" : "Nuevo horario"}</h2>
            <form onSubmit={saveRule} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Medico
                <select
                  value={form.medico_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, medico_id: event.target.value }))}
                  disabled={!canManage}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">Seleccione medico</option>
                  {medicos.map((medico) => <option key={medico.id} value={medico.id}>{doctorLabel(medico)}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Dia
                  <select value={form.dia_semana} onChange={(event) => setForm((prev) => ({ ...prev, dia_semana: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                    {DAY_OPTIONS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Tipo
                  <select value={form.tipo} onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value as AppointmentType, duracion_minutos: event.target.value === "Consulta" ? "15" : prev.duracion_minutos }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                    {TYPE_OPTIONS.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Inicio
                  <input type="time" value={form.hora_inicio} onChange={(event) => setForm((prev) => ({ ...prev, hora_inicio: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:[color-scheme:dark]" />
                </label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Fin
                  <input type="time" value={form.hora_fin} onChange={(event) => setForm((prev) => ({ ...prev, hora_fin: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:[color-scheme:dark]" />
                </label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Min
                  <input type="number" min={1} value={form.duracion_minutos} onChange={(event) => setForm((prev) => ({ ...prev, duracion_minutos: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" checked={form.activo} onChange={(event) => setForm((prev) => ({ ...prev, activo: event.target.checked }))} className="h-4 w-4" />
                Activo
              </label>

              <div className="flex justify-end gap-2">
                {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancelar</button>}
                <button type="submit" disabled={isSaving || !canManage} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Reglas semanales</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Estas reglas generan la agenda automaticamente todas las semanas.</p>
            </div>
            {isLoading ? (
              <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Cargando horarios...</div>
            ) : rules.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Todavia no hay horarios configurados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Medico</th>
                      <th className="px-4 py-3">Dia</th>
                      <th className="px-4 py-3">Horario</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Duracion</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {rules.map((rule) => {
                      const medico = medicos.find((item) => item.id === rule.medico_id);
                      return (
                        <tr key={rule.id}>
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{doctorLabel(medico)}</td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{dayLabel(rule.dia_semana)}</td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{rule.hora_inicio} - {rule.hora_fin}</td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{typeLabel(rule.tipo)}</td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{rule.duracion_minutos} min</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.activo === false ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                              {rule.activo === false ? "Inactivo" : "Activo"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => editRule(rule)} className="mr-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Editar</button>
                            <button onClick={() => toggleRule(rule)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              {rule.activo === false ? "Activar" : "Desactivar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
