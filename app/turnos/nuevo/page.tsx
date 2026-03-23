"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";

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

export default function NuevoTurnoPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [formData, setFormData] = useState({
    paciente_id: "",
    fecha: "",
    hora: "",
    motivo: "",
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
        const pacientesRecords = await pb.collection("pacientes").getFullList<Paciente>({
          sort: "apellido,nombre",
        });
        setPacientes(pacientesRecords);
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
      }
    };

    loadData();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const fechaHoraIso = new Date(`${formData.fecha}T${formData.hora}`).toISOString();
      
      await pb.collection("turnos").create({
        paciente_id: formData.paciente_id,
        fecha_hora: fechaHoraIso,
        motivo: formData.motivo,
        estado: "pendiente"
      });
      
      router.push("/turnos");
    } catch (error) {
      console.error("Error al guardar turno:", error);
      alert("Error al guardar el turno. Verifica que la colección 'turnos' exista en PocketBase.");
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Agendar Nuevo Turno</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Completa los datos para agendar el turno</p>
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
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
              >
                <option value="">Seleccione un paciente</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.apellido}, {p.nombre} (DNI: {p.dni})</option>
                ))}
              </select>
              {pacientes.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  No hay pacientes registrados. Ve a Gestión de Pacientes primero.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha *</label>
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
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hora *</label>
                <input 
                  required 
                  type="time" 
                  name="hora" 
                  value={formData.hora} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Motivo / Observaciones</label>
              <textarea 
                name="motivo" 
                value={formData.motivo} 
                onChange={handleInputChange} 
                rows={3}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 resize-none" 
                placeholder="Ej: Control general, receta lentes..."
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isLoading || pacientes.length === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? "Guardando..." : "Agendar Turno"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}