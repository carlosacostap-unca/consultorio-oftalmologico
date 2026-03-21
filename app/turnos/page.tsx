"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
}

interface Turno {
  id: string;
  paciente_id: string;
  fecha_hora: string;
  motivo: string;
  estado: "pendiente" | "completado" | "cancelado";
  consulta_id?: string;
  expand?: {
    paciente_id: Paciente;
  };
}

export default function TurnosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [filterPatient, setFilterPatient] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        // Cargar turnos (expandiendo la relación con pacientes para mostrar sus nombres)
        const turnosRecords = await pb.collection("turnos").getFullList<Turno>({
          sort: "fecha_hora",
          expand: "paciente_id",
        });
        setTurnos(turnosRecords);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Suscripción en tiempo real a turnos
    let unsubscribe: () => void;
    pb.collection("turnos")
      .subscribe<Turno>("*", async (e) => {
        // Recargar todo por simplicidad y para asegurar que 'expand' venga correcto
        const turnosRecords = await pb.collection("turnos").getFullList<Turno>({
          sort: "fecha_hora",
          expand: "paciente_id",
        });
        setTurnos(turnosRecords);
      })
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((err) => console.log("Suscripción fallida a turnos:", err));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const handleEstadoChange = async (id: string, nuevoEstado: string) => {
    try {
      await pb.collection("turnos").update(id, { estado: nuevoEstado });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este turno?")) {
      try {
        await pb.collection("turnos").delete(id);
      } catch (error) {
        console.error("Error al eliminar turno:", error);
      }
    }
  };

  const filteredTurnos = turnos.filter(turno => {
    let matchPatient = true;
    let matchDate = true;

    if (filterPatient) {
      const search = filterPatient.toLowerCase();
      const p = turno.expand?.paciente_id;
      if (p) {
        matchPatient = 
          p.nombre.toLowerCase().includes(search) || 
          p.apellido.toLowerCase().includes(search) || 
          p.dni.includes(search);
      } else {
        matchPatient = false;
      }
    }

    if (filterDate) {
      // Local date part comparison
      const d = new Date(turno.fecha_hora);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const turnoDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      matchDate = turnoDate === filterDate;
    }

    return matchPatient && matchDate;
  });

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Gestión de Turnos</h1>
              <p className="text-zinc-500 dark:text-zinc-400">Agenda y administra las citas médicas</p>
            </div>
          </div>
          <Link 
            href="/turnos/nuevo"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Turno
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Buscar Paciente</label>
            <input 
              type="text" 
              placeholder="Nombre, apellido o DNI..." 
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 text-sm"
            />
          </div>
          <div className="flex-1 sm:max-w-xs">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Filtrar por Fecha</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] text-sm"
            />
          </div>
          {(filterPatient || filterDate) && (
            <div className="flex items-end">
              <button 
                onClick={() => { setFilterPatient(''); setFilterDate(''); }}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Listado de Turnos */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                  <th className="px-6 py-4 font-medium">Paciente</th>
                  <th className="px-6 py-4 font-medium">Motivo</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      Cargando turnos...
                    </td>
                  </tr>
                ) : filteredTurnos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      No hay turnos agendados con esos filtros.
                    </td>
                  </tr>
                ) : (
                  filteredTurnos.map((turno, index) => {
                    const fecha = new Date(turno.fecha_hora);
                    return (
                      <tr key={turno.id || `temp-key-${index}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {fecha.toLocaleDateString()}
                          </div>
                          <div className="text-zinc-500 dark:text-zinc-400">
                            {fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {turno.expand?.paciente_id ? `${turno.expand.paciente_id.apellido}, ${turno.expand.paciente_id.nombre}` : 'Paciente no encontrado'}
                          </div>
                          {turno.expand?.paciente_id && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              DNI: {turno.expand.paciente_id.dni}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                          {turno.motivo || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={turno.estado}
                            onChange={(e) => handleEstadoChange(turno.id, e.target.value)}
                            className={`px-2 py-1 rounded-md text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                              turno.estado === 'pendiente' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50' : 
                              turno.estado === 'completado' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' : 
                              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'
                            }`}
                          >
                            <option value="pendiente" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Pendiente</option>
                            <option value="completado" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Completado</option>
                            <option value="cancelado" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Cancelado</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          {turno.consulta_id ? (
                            <Link
                              href={`/consultas/${turno.consulta_id}`}
                              className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
                              title="Ver Consulta"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                          ) : (
                            <Link
                              href={`/consultas/nueva?paciente_id=${turno.paciente_id}&turno_id=${turno.id}`}
                              className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors flex items-center gap-1"
                              title="Crear Consulta"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </Link>
                          )}
                          <Link 
                            href={`/turnos/${turno.id}?mode=view`}
                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ver turno"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <Link 
                            href={`/turnos/${turno.id}`}
                            className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="Editar turno"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button 
                            onClick={() => handleDelete(turno.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar turno"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}