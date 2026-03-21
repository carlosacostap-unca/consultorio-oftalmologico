"use client";

import { useState, useEffect, Suspense } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
}

interface Consulta {
  id: string;
  fecha: string;
  diagnostico: string;
}

export default function NuevaRecetaPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <NuevaRecetaForm />
    </Suspense>
  );
}

function NuevaRecetaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const initialConsultaId = searchParams.get('consulta_id') || "";
  const initialPacienteId = searchParams.get('paciente_id') || "";

  const [formData, setFormData] = useState({
    paciente_id: initialPacienteId,
    consulta_id: initialConsultaId,
    fecha: new Date().toISOString().split('T')[0],
    medicamentos: "",
    indicaciones: "",
  });

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadPacientesYConsultas = async () => {
      try {
        const pacientesRecords = await pb.collection("pacientes").getFullList<Paciente>({
          sort: "apellido,nombre",
        });
        setPacientes(pacientesRecords);

        // Si tenemos un paciente_id, cargar sus consultas
        if (formData.paciente_id) {
          const consultasRecords = await pb.collection("consultas").getFullList<Consulta>({
            filter: `paciente_id = "${formData.paciente_id}"`,
            sort: "-fecha",
          });
          setConsultas(consultasRecords);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };

    loadPacientesYConsultas();
  }, [router, formData.paciente_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fechaConHora = `${formData.fecha} 12:00:00.000Z`;

      await pb.collection("recetas").create({
        paciente_id: formData.paciente_id,
        consulta_id: formData.consulta_id || null, // Opcional
        fecha: fechaConHora,
        medicamentos: formData.medicamentos,
        indicaciones: formData.indicaciones,
      });

      router.push(initialConsultaId ? `/consultas/${initialConsultaId}` : "/recetas");
    } catch (error: any) {
      console.error("Error al guardar la receta:", error);
      alert(error.message || "Error al guardar la receta");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Nueva Receta</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Completá los datos para generar una nueva receta</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Paciente *
                  </label>
                  <select
                    required
                    value={formData.paciente_id}
                    onChange={(e) => setFormData({ ...formData, paciente_id: e.target.value, consulta_id: "" })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100"
                  >
                    <option value="">Seleccione un paciente</option>
                    {pacientes.map((paciente) => (
                      <option key={paciente.id} value={paciente.id}>
                        {paciente.apellido}, {paciente.nombre} - DNI: {paciente.dni}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Fecha de Receta *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:[color-scheme:dark] dark:text-zinc-100"
                  />
                </div>
              </div>

              {formData.paciente_id && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Consulta Relacionada (Opcional)
                  </label>
                  <select
                    value={formData.consulta_id}
                    onChange={(e) => setFormData({ ...formData, consulta_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100"
                  >
                    <option value="">Ninguna o crear sin consulta</option>
                    {consultas.map((consulta) => (
                      <option key={consulta.id} value={consulta.id}>
                        {new Date(consulta.fecha).toLocaleDateString("es-AR")} - {consulta.diagnostico ? consulta.diagnostico.substring(0, 50) + "..." : "Sin diagnóstico"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <hr className="border-zinc-200 dark:border-zinc-800" />

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Medicamentos / Anteojos *
                </label>
                <textarea
                  required
                  value={formData.medicamentos}
                  onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                  rows={4}
                  placeholder="Ej. Lentes de contacto, Gotas oftálmicas..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Indicaciones / Uso
                </label>
                <textarea
                  value={formData.indicaciones}
                  onChange={(e) => setFormData({ ...formData, indicaciones: e.target.value })}
                  rows={4}
                  placeholder="Ej. Aplicar 2 gotas cada 8 horas por 7 días..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100 resize-none"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-orange-600/20"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  "Guardar Receta"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
