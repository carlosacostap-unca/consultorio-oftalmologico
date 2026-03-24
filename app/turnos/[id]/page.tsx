"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter, useParams, useSearchParams } from "next/navigation";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento?: string;
  obra_social?: string;
  numero_afiliado?: string;
  domicilio?: string;
}

interface Turno {
  id: string;
  paciente_id: string;
  fecha_hora: string;
  motivo: string;
  observaciones?: string;
  estado?: string;
  consulta_id?: string;
  disponibilidad_id?: string;
  tipo?: string;
  duracion?: number;
  es_sobreturno?: boolean;
  sobreturno_tipo?: "consulta" | "estudio" | "cirugía";
  expand?: {
    paciente_id: Paciente;
  };
}

interface Disponibilidad {
  id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  tipo: "Consulta" | "Estudio" | "Cirugía";
}

export default function TurnoFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const isViewMode = searchParams.get("mode") === "view";
  const turnoId = params.id as string;

  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [isLoadingDisponibilidades, setIsLoadingDisponibilidades] = useState(false);
  const [selectedDisponibilidad, setSelectedDisponibilidad] = useState<Disponibilidad | null>(null);

  const [formData, setFormData] = useState({
    paciente_id: "",
    fecha: "",
    hora: "",
    motivo: "",
    observaciones: "",
    disponibilidad_id: "",
    duracion: "",
    tipo: "",
    estado: "",
    es_sobreturno: false,
    sobreturno_tipo: "",
  });

  const TURN_STATES = ["En espera", "En consulta", "Atendido", "Ausente", "Atrasado", "Quiere adelantarlo", "No llegó"];

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const pacientesRecords = await pb.collection("pacientes").getFullList<Paciente>({
          sort: "apellido,nombre",
        });
        setPacientes(pacientesRecords);

        if (turnoId) {
          const turno = await pb.collection("turnos").getOne<Turno>(turnoId);
          
          const d = new Date(turno.fecha_hora);
          const pad = (n: number) => n.toString().padStart(2, '0');
          const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

          setFormData({
            paciente_id: turno.paciente_id,
            fecha: datePart,
            hora: timePart,
            motivo: turno.motivo || "",
            observaciones: turno.observaciones || "",
            disponibilidad_id: turno.disponibilidad_id || "",
            duracion: turno.duracion ? turno.duracion.toString() : "",
            tipo: turno.tipo || "",
            estado: turno.estado || "",
            es_sobreturno: turno.es_sobreturno || false,
            sobreturno_tipo: turno.sobreturno_tipo || "",
          });
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };

    loadData();
  }, [router, turnoId]);

  useEffect(() => {
    async function fetchDisponibilidades() {
      if (!formData.fecha) return;
      
      setIsLoadingDisponibilidades(true);
      try {
        const startOfDay = new Date(`${formData.fecha}T00:00:00Z`).toISOString().replace('T', ' ');
        const endOfDay = new Date(`${formData.fecha}T23:59:59Z`).toISOString().replace('T', ' ');
        
        const records = await pb.collection("disponibilidades").getFullList<Disponibilidad>({
          filter: `fecha_hora_inicio >= "${startOfDay}" && fecha_hora_inicio <= "${endOfDay}"`,
          sort: "fecha_hora_inicio",
        });
        setDisponibilidades(records);
        
        if (formData.disponibilidad_id) {
          const disp = records.find(d => d.id === formData.disponibilidad_id);
          if (disp) setSelectedDisponibilidad(disp);
        }
      } catch (error) {
        console.error("Error cargando disponibilidades:", error);
      } finally {
        setIsLoadingDisponibilidades(false);
      }
    }

    if (!isViewMode) {
      fetchDisponibilidades();
    }
  }, [formData.fecha, isViewMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name === "disponibilidad_id") {
      const disp = disponibilidades.find(d => d.id === value) || null;
      setSelectedDisponibilidad(disp);
      setFormData(prev => ({
        ...prev,
        disponibilidad_id: value,
        hora: disp ? new Date(disp.fecha_hora_inicio).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: false}) : "",
        duracion: disp?.tipo === "Consulta" ? "15" : "",
        tipo: disp?.tipo || "Consulta"
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    
    if (selectedDisponibilidad && !formData.es_sobreturno) {
      const turnoDate = new Date(`${formData.fecha}T${formData.hora}:00`);
      const dispStart = new Date(selectedDisponibilidad.fecha_hora_inicio);
      const dispEnd = new Date(selectedDisponibilidad.fecha_hora_fin);
      
      if (turnoDate < dispStart || turnoDate > dispEnd) {
        const startStr = dispStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const endStr = dispEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        alert(`La hora debe estar dentro del rango de la disponibilidad (${startStr} - ${endStr}). Si es un sobreturno, marque la casilla correspondiente.`);
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const fechaHoraIso = new Date(`${formData.fecha}T${formData.hora}`).toISOString();
      
      await pb.collection("turnos").update(turnoId, {
        paciente_id: formData.paciente_id,
        fecha_hora: fechaHoraIso,
        motivo: formData.motivo,
        observaciones: formData.observaciones,
        disponibilidad_id: formData.disponibilidad_id,
        duracion: formData.duracion ? parseInt(formData.duracion) : null,
        tipo: formData.tipo,
        estado: formData.estado,
        es_sobreturno: formData.es_sobreturno,
        sobreturno_tipo: formData.es_sobreturno ? formData.sobreturno_tipo : "",
      });
      
      router.push("/turnos");
    } catch (error) {
      console.error("Error al actualizar turno:", error);
      alert("Error al actualizar el turno.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {isViewMode ? "Ver Turno" : "Editar Turno"}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {isViewMode ? "Detalles del turno agendado" : "Modifica los datos del turno"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Paciente *</label>
              <select 
                required 
                name="paciente_id" 
                value={formData.paciente_id} 
                onChange={handleInputChange} 
                disabled={isViewMode}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
              >
                <option value="">Seleccione un paciente</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.apellido}, {p.nombre} (DNI: {p.dni})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha *</label>
                <input 
                  required 
                  type="date" 
                  name="fecha" 
                  value={formData.fecha} 
                  onChange={handleInputChange} 
                  disabled={isViewMode}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] disabled:opacity-70" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Disponibilidad *
                  {isLoadingDisponibilidades && <span className="ml-2 text-xs text-blue-500">Cargando...</span>}
                </label>
                <select 
                  required={!formData.es_sobreturno} 
                  name="disponibilidad_id" 
                  value={formData.disponibilidad_id} 
                  onChange={handleInputChange} 
                  disabled={!formData.fecha || isLoadingDisponibilidades || isViewMode}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
                >
                  <option value="">
                    {!formData.fecha ? "Seleccione una fecha primero" : 
                     disponibilidades.length === 0 ? "No hay disponibilidades para esta fecha" : 
                     "Seleccione un bloque horario"}
                  </option>
                  {disponibilidades.map(d => {
                        const startStr = new Date(d.fecha_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const endStr = new Date(d.fecha_hora_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        return (
                          <option key={d.id} value={d.id}>
                            {startStr} - {endStr} ({d.tipo})
                          </option>
                        );
                      })}
                </select>
              </div>
            </div>

            {(selectedDisponibilidad || formData.es_sobreturno) && (() => {
              const minTime = selectedDisponibilidad ? new Date(selectedDisponibilidad.fecha_hora_inicio).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: false}) : undefined;
              const maxTime = selectedDisponibilidad ? new Date(selectedDisponibilidad.fecha_hora_fin).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: false}) : undefined;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hora de inicio *</label>
                    <input 
                      required 
                      type="time" 
                      name="hora" 
                      value={formData.hora} 
                      min={minTime}
                      max={maxTime}
                      onChange={handleInputChange} 
                      disabled={isViewMode}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] disabled:opacity-70" 
                    />
                    {minTime && maxTime && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Debe estar entre {minTime} y {maxTime}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Duración (minutos) *</label>
                    <input 
                      required 
                      type="number" 
                      name="duracion" 
                      min="1"
                      value={formData.duracion} 
                      onChange={handleInputChange} 
                      disabled={isViewMode}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70" 
                      placeholder={selectedDisponibilidad?.tipo === "Consulta" ? "15" : "Ej: 60"}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {selectedDisponibilidad?.tipo === "Consulta" ? "Por defecto 15 minutos para consultas" : "Debe especificar la duración"}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="es_sobreturno"
                  name="es_sobreturno"
                  checked={formData.es_sobreturno}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  className="w-5 h-5 text-orange-600 rounded border-orange-300 focus:ring-orange-500 dark:border-orange-700 dark:bg-zinc-900 disabled:opacity-70"
                />
                <div>
                  <label htmlFor="es_sobreturno" className="font-medium text-orange-900 dark:text-orange-200">
                    Es un sobreturno
                  </label>
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    Permite agendar el turno fuera del horario regular o superpuesto con otros turnos.
                  </p>
                </div>
              </div>

              {formData.es_sobreturno && (
                <div className="ml-8 mt-2">
                  <label className="block text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                    Tipo de sobreturno *
                  </label>
                  <select
                    name="sobreturno_tipo"
                    value={formData.sobreturno_tipo}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    required={formData.es_sobreturno}
                    className="w-full sm:w-1/2 px-3 py-2 bg-white dark:bg-zinc-950 border border-orange-200 dark:border-orange-800/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-zinc-200 disabled:opacity-70"
                  >
                    <option value="">Seleccionar tipo...</option>
                    <option value="consulta">Consulta</option>
                    <option value="estudio">Estudio</option>
                    <option value="cirugía">Cirugía</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Estado del Turno</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleInputChange}
                disabled={isViewMode}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
              >
                <option value="">Sin asignar</option>
                {TURN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Motivo</label>
              <textarea 
                name="motivo" 
                value={formData.motivo} 
                onChange={handleInputChange} 
                disabled={isViewMode}
                rows={2}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 resize-none disabled:opacity-70" 
                placeholder="Ej: Control general, receta lentes..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Observaciones</label>
              <textarea 
                name="observaciones" 
                value={formData.observaciones} 
                onChange={handleInputChange} 
                disabled={isViewMode}
                rows={3}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 resize-none disabled:opacity-70" 
                placeholder="Agregar observaciones..."
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors"
              >
                {isViewMode ? 'Volver' : 'Cancelar'}
              </button>
              {!isViewMode && (
                <button 
                  type="submit"
                  disabled={isLoading || pacientes.length === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}