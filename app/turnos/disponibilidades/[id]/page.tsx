"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { formatDate } from "@/lib/utils";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  obra_social?: string;
}

interface Turno {
  id: string;
  paciente_id: string;
  medico_id?: string;
  fecha_hora: string;
  motivo?: string;
  estado?: string;
  consulta_id?: string;
  tipo?: string;
  duracion?: number;
  es_sobreturno?: boolean;
  expand?: {
    paciente_id?: Paciente;
    medico_id?: Medico;
  };
}

interface Disponibilidad {
  id: string;
  medico_id?: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  tipo: "Consulta" | "Estudio" | "Cirugía";
  expand?: {
    medico_id?: Medico;
  };
}

interface Medico {
  id: string;
  name?: string;
  email?: string;
}

const AVAILABILITY_TYPES = ["Consulta", "Estudio", "Cirugía"] as const;

function toLocalDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (number: number) => number.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (number: number) => number.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function errorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? Number(error.status)
    : null;
}

const AVAILABILITY_TAB_PATH = "/turnos?tab=availability";

function doctorLabel(doctor?: Medico | null) {
  return doctor?.name || doctor?.email || "Sin medico asignado";
}

export default function DisponibilidadDetallePage() {
  const router = useRouter();
  const params = useParams();
  const disponibilidadId = String(params.id || "");
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [formData, setFormData] = useState({
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    tipo: "Consulta",
  });

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const [availabilityRecord, appointmentRecords] = await Promise.all([
          pb.collection("disponibilidades").getOne<Disponibilidad>(disponibilidadId, {
            expand: "medico_id",
          }),
          pb.collection("turnos").getFullList<Turno>({
            filter: `disponibilidad_id = "${disponibilidadId}"`,
            sort: "fecha_hora",
            expand: "paciente_id,medico_id",
          }),
        ]);

        setDisponibilidad(availabilityRecord);
        setTurnos(appointmentRecords);
        setFormData({
          fecha: toLocalDateInput(availabilityRecord.fecha_hora_inicio),
          hora_inicio: toLocalTimeInput(availabilityRecord.fecha_hora_inicio),
          hora_fin: toLocalTimeInput(availabilityRecord.fecha_hora_fin),
          tipo: availabilityRecord.tipo,
        });
        setIsEditing(false);
      } catch (error) {
        console.error("Error al cargar disponibilidad:", error);
        if (errorStatus(error) === 404) {
          alert("No se encontro la disponibilidad.");
          router.push(AVAILABILITY_TAB_PATH);
          return;
        }
        alert("No se pudo cargar la disponibilidad.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [disponibilidadId, router]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveAvailability = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!disponibilidad || !isEditing) return;

    setIsSaving(true);
    try {
      const updated = await pb.collection("disponibilidades").update<Disponibilidad>(disponibilidad.id, {
        fecha_hora_inicio: new Date(`${formData.fecha}T${formData.hora_inicio}:00`).toISOString(),
        fecha_hora_fin: new Date(`${formData.fecha}T${formData.hora_fin}:00`).toISOString(),
        tipo: formData.tipo,
      });

      setDisponibilidad(updated);
      setFormData({
        fecha: toLocalDateInput(updated.fecha_hora_inicio),
        hora_inicio: toLocalTimeInput(updated.fecha_hora_inicio),
        hora_fin: toLocalTimeInput(updated.fecha_hora_fin),
        tipo: updated.tipo,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error al guardar disponibilidad:", error);
      alert("No se pudo guardar la disponibilidad.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAvailability = async () => {
    if (!disponibilidad) return;
    if (!confirm("¿Estás seguro de eliminar esta disponibilidad? Los turnos asignados podrían quedar sin disponibilidad asociada.")) return;

    setIsSaving(true);
    try {
      await pb.collection("disponibilidades").delete(disponibilidad.id);
      router.push(AVAILABILITY_TAB_PATH);
    } catch (error) {
      console.error("Error al eliminar disponibilidad:", error);
      alert("No se pudo eliminar la disponibilidad.");
      setIsSaving(false);
    }
  };

  if (!isMounted || !user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Cargando disponibilidad...
        </div>
      </div>
    );
  }

  if (!disponibilidad) return null;

  const startDate = new Date(disponibilidad.fecha_hora_inicio);
  const endDate = new Date(disponibilidad.fecha_hora_fin);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(AVAILABILITY_TAB_PATH)}
              className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Detalle de disponibilidad</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {formatDate(startDate)} · {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isEditing || isSaving}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors disabled:opacity-50"
            >
              {isEditing ? "Editando" : "Editar"}
            </button>
            <button
              type="button"
              onClick={deleteAvailability}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-6">
          <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Datos de la disponibilidad</h2>
            </div>
            <form onSubmit={saveAvailability} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Medico</label>
                <input
                  type="text"
                  value={doctorLabel(disponibilidad.expand?.medico_id)}
                  disabled
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg dark:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha</label>
                <input
                  required
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  disabled={!isEditing || isSaving}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hora Inicio</label>
                  <input
                    required
                    type="time"
                    name="hora_inicio"
                    value={formData.hora_inicio}
                    onChange={handleInputChange}
                    disabled={!isEditing || isSaving}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hora Fin</label>
                  <input
                    required
                    type="time"
                    name="hora_fin"
                    value={formData.hora_fin}
                    onChange={handleInputChange}
                    disabled={!isEditing || isSaving}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo</label>
                <select
                  required
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  disabled={!isEditing || isSaving}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {AVAILABILITY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              {isEditing && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              )}
            </form>
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Turnos otorgados</h2>
              <span className="inline-flex min-w-8 justify-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {turnos.length}
              </span>
            </div>
            {turnos.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                No hay turnos otorgados dentro de esta disponibilidad.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Hora</th>
                      <th className="px-6 py-4 font-medium">Paciente</th>
                      <th className="px-6 py-4 font-medium">Motivo</th>
                      <th className="px-6 py-4 font-medium">Estado</th>
                      <th className="px-6 py-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {turnos.map((turno) => {
                      const appointmentDate = new Date(turno.fecha_hora);
                      const paciente = turno.expand?.paciente_id;

                      return (
                        <tr key={turno.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                            {appointmentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {paciente ? `${paciente.apellido.toUpperCase()}, ${paciente.nombre.toUpperCase()}` : "Sin paciente asignado"}
                            </div>
                            {paciente && <div className="text-xs text-zinc-500 dark:text-zinc-400">DNI: {paciente.dni}</div>}
                          </td>
                          <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{turno.motivo || "-"}</td>
                          <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{turno.estado || "Sin asignar"}</td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/turnos/${turno.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Ver turno
                            </Link>
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
