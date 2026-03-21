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
  obra_social: string;
  numero_afiliado: string;
  fecha_nacimiento: string;
}

interface Consulta {
  id: string;
  paciente_id: string;
  fecha: string;
  motivo_consulta: string;
  diagnostico: string;
  expand?: {
    paciente_id: Paciente;
  };
}

export default function ConsultasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para los filtros
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
        const consultasRecords = await pb.collection("consultas").getFullList<Consulta>({
          sort: "-fecha",
          expand: "paciente_id",
        });
        setConsultas(consultasRecords);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    let unsubscribe: () => void;
    pb.collection("consultas")
      .subscribe<Consulta>("*", async () => {
        const records = await pb.collection("consultas").getFullList<Consulta>({
          sort: "-fecha",
          expand: "paciente_id",
        });
        setConsultas(records);
      })
      .then((unsub) => { unsubscribe = unsub; })
      .catch((err) => console.log("Suscripción fallida a consultas:", err));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta consulta?")) {
      try {
        await pb.collection("consultas").delete(id);
      } catch (error) {
        console.error("Error al eliminar consulta:", error);
      }
    }
  };

  const filteredConsultas = consultas.filter((consulta) => {
    let matchesPatient = true;
    let matchesDate = true;

    if (filterPatient) {
      const patientName = consulta.expand?.paciente_id 
        ? `${consulta.expand.paciente_id.nombre} ${consulta.expand.paciente_id.apellido}`.toLowerCase()
        : "";
      matchesPatient = patientName.includes(filterPatient.toLowerCase());
    }

    if (filterDate) {
      const consultaDate = new Date(consulta.fecha).toISOString().split('T')[0];
      matchesDate = consultaDate === filterDate;
    }

    return matchesPatient && matchesDate;
  });

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-6">
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
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Gestión de Consultas</h1>
              <p className="text-zinc-500 dark:text-zinc-400">Historial médico y atenciones</p>
            </div>
          </div>
          <Link 
            href="/consultas/nueva"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Consulta
          </Link>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Filtrar por Paciente</label>
            <input 
              type="text" 
              placeholder="Nombre o apellido..." 
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
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Listado de Consultas */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Paciente</th>
                  <th className="px-6 py-4 font-medium">Motivo de Consulta</th>
                  <th className="px-6 py-4 font-medium">Diagnóstico</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      Cargando consultas...
                    </td>
                  </tr>
                ) : filteredConsultas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      {consultas.length === 0 ? "No hay consultas registradas." : "No se encontraron consultas que coincidan con los filtros."}
                    </td>
                  </tr>
                ) : (
                  filteredConsultas.map((consulta, index) => {
                    const fecha = new Date(consulta.fecha);
                    return (
                      <tr key={consulta.id || `temp-key-${index}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {fecha.toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {consulta.expand?.paciente_id ? `${consulta.expand.paciente_id.apellido}, ${consulta.expand.paciente_id.nombre}` : 'Paciente no encontrado'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 max-w-xs truncate">
                          {consulta.motivo_consulta || '-'}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 max-w-xs truncate">
                          {consulta.diagnostico || '-'}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Link
                            href={`/consultas/${consulta.id}?mode=view`}
                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
                            title="Ver consulta"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <Link
                            href={`/consultas/${consulta.id}`}
                            className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors flex items-center gap-1"
                            title="Editar consulta"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button 
                            onClick={() => handleDelete(consulta.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar consulta"
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