"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface Disponibilidad {
  id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  tipo: "Consulta" | "Estudio" | "Cirugía";
  created: string;
}

export default function DisponibilidadesPage() {
  const router = useRouter();
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    tipo: "Consulta",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const records = await pb.collection("disponibilidades").getFullList<Disponibilidad>({
        sort: "-fecha_hora_inicio",
      });
      setDisponibilidades(records);
    } catch (error: any) {
      console.error("Error al cargar disponibilidades:", error);
      if (error.status === 404) {
        setErrorMsg("La colección 'disponibilidades' no existe en PocketBase. Por favor, créala con los campos: fecha_hora_inicio (Datetime), fecha_hora_fin (Datetime), tipo (select: Consulta, Estudio, Cirugía).");
      } else {
        setErrorMsg("Error al cargar las disponibilidades.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");

    try {
      // Combina la fecha con la hora para crear Datetimes completos
      // PocketBase espera ISO 8601, ej: "2022-01-01 10:00:00.000Z"
      // Usaremos UTC para asegurarnos que la fecha se guarde tal cual se ingresó.
      const startDateTime = new Date(`${formData.fecha}T${formData.hora_inicio}:00`).toISOString();
      const endDateTime = new Date(`${formData.fecha}T${formData.hora_fin}:00`).toISOString();
      
      await pb.collection("disponibilidades").create({
        fecha_hora_inicio: startDateTime,
        fecha_hora_fin: endDateTime,
        tipo: formData.tipo,
      });

      setFormData({
        fecha: "",
        hora_inicio: "",
        hora_fin: "",
        tipo: "Consulta",
      });
      setShowForm(false);
      loadData();
    } catch (error: any) {
      console.error("Error al guardar disponibilidad:", error);
      if (error.status === 404) {
        setErrorMsg("La colección 'disponibilidades' no existe en PocketBase.");
      } else {
        setErrorMsg("Error al guardar la disponibilidad. Verifica los datos.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta disponibilidad? Los turnos asignados podrían quedar sin disponibilidad asociada.")) return;
    
    try {
      await pb.collection("disponibilidades").delete(id);
      loadData();
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Error al eliminar la disponibilidad");
    }
  };

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Disponibilidades de Turnos</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Configura los bloques horarios disponibles para agendar turnos</p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {showForm ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Disponibilidad
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        {showForm && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Agregar Nueva Disponibilidad</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha</label>
                <input 
                  required 
                  type="date" 
                  name="fecha" 
                  value={formData.fecha} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hora Inicio</label>
                <input 
                  required 
                  type="time" 
                  name="hora_inicio" 
                  value={formData.hora_inicio} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]" 
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
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo</label>
                <select 
                  required 
                  name="tipo" 
                  value={formData.tipo} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                >
                  <option value="Consulta">Consulta</option>
                  <option value="Estudio">Estudio</option>
                  <option value="Cirugía">Cirugía</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end mt-2">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar Disponibilidad"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-500">Cargando disponibilidades...</div>
          ) : disponibilidades.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No hay disponibilidades configuradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Horario</th>
                    <th className="px-6 py-4 font-medium">Tipo</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {disponibilidades.map((disp) => {
                    const startDate = new Date(disp.fecha_hora_inicio);
                    const endDate = new Date(disp.fecha_hora_fin);
                    
                    return (
                      <tr key={disp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {formatDate(startDate)}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            disp.tipo === 'Consulta' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                            disp.tipo === 'Estudio' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' :
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                          }`}>
                            {disp.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(disp.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
