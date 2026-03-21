"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  obra_social: string;
  numero_afiliado: string;
  fecha_nacimiento: string;
}

import { use } from "react";

export default function EditarConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <EditarConsultaForm consultaId={resolvedParams.id} />
    </Suspense>
  );
}

function EditarConsultaForm({ consultaId }: { consultaId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isViewMode = searchParams.get("mode") === "view";
  
  console.log("Consulta ID recibido:", consultaId);
  
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Para auto-completar datos del paciente seleccionado
  const [selectedPacienteData, setSelectedPacienteData] = useState<Paciente | null>(null);

  // Extraer parámetros de la URL
  const initialPacienteId = searchParams.get('paciente_id') || "";
  const turnoId = searchParams.get('turno_id') || "";

  // Estado inicial del formulario basado en la captura
  const initialFormState = {
    paciente_id: initialPacienteId,
    fecha: new Date().toISOString().split('T')[0],
    motivo_consulta: "",
    
    av_sc_od: "", av_sc_oi: "",
    av_cc_od: "", av_cc_oi: "",
    
    ref_lejos_od_esf: "", ref_lejos_od_cil: "", ref_lejos_od_eje: "",
    ref_lejos_oi_esf: "", ref_lejos_oi_cil: "", ref_lejos_oi_eje: "",
    
    ref_cerca_od_esf: "", ref_cerca_od_cil: "", ref_cerca_od_eje: "",
    ref_cerca_oi_esf: "", ref_cerca_oi_cil: "", ref_cerca_oi_eje: "",
    
    pio_od: "", pio_oi: "",
    fondo_ojo: "",
    diagnostico: "",
    tratamiento: "",
    
    ant_alergico: false, ant_asmatico: false, ant_reuma: false,
    ant_gota: false, ant_herpes: false, ant_diabetes: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [recetasAsociadas, setRecetasAsociadas] = useState<any[]>([]);

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

        // Cargar datos de la consulta existente
        if (consultaId) {
          const consultaRecord = await pb.collection("consultas").getOne(consultaId);
          
          let fechaFormateada = new Date().toISOString().split('T')[0];
          try {
            if (consultaRecord.fecha) {
              fechaFormateada = new Date(consultaRecord.fecha).toISOString().split('T')[0];
            }
          } catch (e) {
            console.error("Error al formatear fecha:", e);
          }

          setFormData(prev => ({
            ...prev,
            ...consultaRecord,
            fecha: fechaFormateada,
            // Asegurar que paciente_id se establezca correctamente si viene de la consulta
            paciente_id: consultaRecord.paciente_id || prev.paciente_id
          }));
          // Cargar recetas asociadas
          try {
            const recetasRecords = await pb.collection("recetas").getFullList({
              filter: `consulta_id = "${consultaId}"`,
              sort: "-created",
            });
            setRecetasAsociadas(recetasRecords);
          } catch (e) {
            console.log("Error al cargar recetas o no existen aún");
          }
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
        alert("Error al cargar los datos de la consulta. Verifica la consola.");
      }
    };

    loadData();
  }, [router, consultaId]);

  // Actualizar cabecera de paciente cuando se selecciona uno
  useEffect(() => {
    if (formData.paciente_id) {
      const p = pacientes.find(p => p.id === formData.paciente_id) || null;
      setSelectedPacienteData(p);
    } else {
      setSelectedPacienteData(null);
    }
  }, [formData.paciente_id, pacientes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Aseguramos formato ISO para la fecha
      const dataToSave = {
        ...formData,
        fecha: new Date(formData.fecha).toISOString(),
      };
      
      await pb.collection("consultas").update(consultaId, dataToSave);
      
      // Si venimos desde un turno, lo actualizamos para enlazarlo y marcarlo completado
      if (turnoId) {
        try {
          await pb.collection("turnos").update(turnoId, {
            consulta_id: consultaId,
            estado: "completado"
          });
        } catch (turnoError) {
          console.error("Error al actualizar el turno:", turnoError);
          alert("La consulta se guardó, pero hubo un error al enlazarla con el turno. Verifica que el campo 'consulta_id' exista en la colección 'turnos' de PocketBase.");
        }
      }

      // Redirigir a la lista de consultas al guardar
      router.push("/consultas");
    } catch (error) {
      console.error("Error al actualizar consulta:", error);
      alert("Error al guardar los cambios.");
      setIsLoading(false);
    }
  };

  // Función auxiliar para calcular edad
  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return "-";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Cabecera */}
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
              {isViewMode ? "Ver Consulta Médica" : "Editar Consulta Médica"}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {isViewMode ? "Detalles de la consulta y examen" : "Modifica los datos de la consulta y el examen"}
            </p>
          </div>
        </div>

        {/* Contenedor del Formulario (Diseño estilo Legacy) */}
        <div className="bg-[#f0f0f0] dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
          
          {/* Header del Formulario */}
          <div className="bg-[#2d8f8f] dark:bg-emerald-800 text-white p-3 border-b-4 border-[#1f6b6b] dark:border-emerald-950 shadow-inner">
            <h2 className="text-2xl font-bold italic tracking-wide text-center w-full shadow-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              Datos Médicos del Paciente
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 text-sm text-zinc-900 dark:text-zinc-100 font-sans">
            
            {/* Sección: DATOS DEL PACIENTE */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Datos del Paciente</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white dark:bg-zinc-800 p-3 rounded border border-zinc-300 dark:border-zinc-700 shadow-sm">
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-xs font-semibold mb-1">Paciente:</label>
                  <select 
                    required name="paciente_id" value={formData.paciente_id} onChange={handleInputChange} disabled={isViewMode} 
                    className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]"
                  >
                    <option value="">-- Seleccionar --</option>
                    {pacientes.map(p => (
                      <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Edad</label>
                  <div className="flex items-center gap-1">
                    <input type="text" readOnly value={selectedPacienteData ? calcularEdad(selectedPacienteData.fecha_nacimiento) : ""} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-center" />
                    <span className="text-xs">Años</span>
                  </div>
                </div>
                <div className="col-span-8 md:col-span-5">
                  <label className="block text-xs font-semibold mb-1">Obra Social</label>
                  <input type="text" readOnly value={selectedPacienteData?.obra_social || ""} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            </div>

            {/* Sección: DATOS MEDICOS */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Datos Médicos</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
              </div>

              <div className="bg-white dark:bg-zinc-800 p-4 rounded border border-zinc-300 dark:border-zinc-700 shadow-sm space-y-4">
                
                {/* Fecha y Motivo */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center border-2 border-zinc-400 dark:border-zinc-600 p-1 bg-zinc-100 dark:bg-zinc-900 shadow-inner">
                    <label className="font-bold mr-2 ml-1 text-sm tracking-wide">FECHA:</label>
                    <input required type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} disabled={isViewMode} className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold text-center focus:outline-none dark:[color-scheme:dark]" />
                  </div>
                  
                  <div className="flex-grow flex items-center gap-2">
                    <label className="font-bold text-sm whitespace-nowrap">MOTIVO DE CONSULTA:</label>
                    <input type="text" name="motivo_consulta" value={formData.motivo_consulta} onChange={handleInputChange} disabled={isViewMode} className="flex-grow px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]" />
                  </div>
                </div>

                {/* Agudeza Visual */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">AGUDEZA VISUAL S/C: OJO DERECHO:</span>
                    <div className="flex items-center gap-1">
                      <input type="text" name="av_sc_od" value={formData.av_sc_od} onChange={handleInputChange} disabled={isViewMode} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                      <span>/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">OJO IZQUIERDO:</span>
                    <div className="flex items-center gap-1">
                      <input type="text" name="av_sc_oi" value={formData.av_sc_oi} onChange={handleInputChange} disabled={isViewMode} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                      <span>/10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">C/C: OJO DERECHO:</span>
                    <div className="flex items-center gap-1">
                      <input type="text" name="av_cc_od" value={formData.av_cc_od} onChange={handleInputChange} disabled={isViewMode} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                      <span>/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">OJO IZQUIERDO:</span>
                    <div className="flex items-center gap-1">
                      <input type="text" name="av_cc_oi" value={formData.av_cc_oi} onChange={handleInputChange} disabled={isViewMode} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                      <span>/10</span>
                    </div>
                  </div>
                </div>

                {/* Refracción */}
                <div className="grid grid-cols-1 lg:grid-cols-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 mt-4">
                  {/* LEJOS */}
                  <div className="p-3 border-b lg:border-b-0 lg:border-r border-zinc-300 dark:border-zinc-700">
                    <div className="font-bold mb-2 underline decoration-zinc-400">LEJOS:</div>
                    <div className="grid grid-cols-4 gap-2 mb-2 items-center text-center text-xs font-semibold">
                      <div className="text-right pr-2"></div>
                      <div>ESFERA</div>
                      <div>CIL.</div>
                      <div>GRADO</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2 items-center">
                      <div className="text-right font-bold text-xs pr-2">OJO DERECHO:</div>
                      <input type="text" name="ref_lejos_od_esf" value={formData.ref_lejos_od_esf} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_lejos_od_cil" value={formData.ref_lejos_od_cil} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_lejos_od_eje" value={formData.ref_lejos_od_eje} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 items-center">
                      <div className="text-right font-bold text-xs pr-2">OJO IZQUIERDO:</div>
                      <input type="text" name="ref_lejos_oi_esf" value={formData.ref_lejos_oi_esf} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_lejos_oi_cil" value={formData.ref_lejos_oi_cil} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_lejos_oi_eje" value={formData.ref_lejos_oi_eje} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                    </div>
                  </div>
                  
                  {/* CERCA */}
                  <div className="p-3">
                    <div className="font-bold mb-2 underline decoration-zinc-400">CERCA:</div>
                    <div className="grid grid-cols-4 gap-2 mb-2 items-center text-center text-xs font-semibold">
                      <div className="text-right pr-2"></div>
                      <div>ESFERA</div>
                      <div>CIL.</div>
                      <div>GRADO</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2 items-center">
                      <div className="text-right font-bold text-xs pr-2">OJO DERECHO:</div>
                      <input type="text" name="ref_cerca_od_esf" value={formData.ref_cerca_od_esf} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_cerca_od_cil" value={formData.ref_cerca_od_cil} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_cerca_od_eje" value={formData.ref_cerca_od_eje} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 items-center">
                      <div className="text-right font-bold text-xs pr-2">OJO IZQUIERDO:</div>
                      <input type="text" name="ref_cerca_oi_esf" value={formData.ref_cerca_oi_esf} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_cerca_oi_cil" value={formData.ref_cerca_oi_cil} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_cerca_oi_eje" value={formData.ref_cerca_oi_eje} onChange={handleInputChange} disabled={isViewMode} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                    </div>
                  </div>
                </div>

                {/* PIO y Textos Finales */}
                <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-2 border border-zinc-300 dark:border-zinc-700">
                    <span className="font-bold text-sm min-w-[150px]">PRESION OCULAR:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs">OJO DERECHO:</span>
                      <input type="text" name="pio_od" value={formData.pio_od} onChange={handleInputChange} disabled={isViewMode} className="w-16 px-1 py-1 border border-zinc-400 text-center" />
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-semibold text-xs">OJO IZQUIERDO:</span>
                      <input type="text" name="pio_oi" value={formData.pio_oi} onChange={handleInputChange} disabled={isViewMode} className="w-16 px-1 py-1 border border-zinc-400 text-center" />
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <label className="font-bold text-sm min-w-[150px] pt-1">FONDO DE OJO:</label>
                    <input type="text" name="fondo_ojo" value={formData.fondo_ojo} onChange={handleInputChange} disabled={isViewMode} className="flex-grow px-2 py-1 border border-zinc-400 focus:border-[#2d8f8f] focus:outline-none" />
                  </div>
                  
                  <div className="flex gap-2 items-start">
                    <label className="font-bold text-sm min-w-[150px] pt-1">DIAGNOSTICO:</label>
                    <input type="text" name="diagnostico" value={formData.diagnostico} onChange={handleInputChange} disabled={isViewMode} className="flex-grow px-2 py-1 border border-zinc-400 focus:border-[#2d8f8f] focus:outline-none" />
                  </div>
                  
                  <div className="flex gap-2 items-start">
                    <label className="font-bold text-sm min-w-[150px] pt-1">TRATAMIENTO:</label>
                    <input type="text" name="tratamiento" value={formData.tratamiento} onChange={handleInputChange} disabled={isViewMode} className="flex-grow px-2 py-1 border border-zinc-400 focus:border-[#2d8f8f] focus:outline-none" />
                  </div>
                </div>

                {/* Antecedentes (Checkboxes) */}
                <div className="mt-4 p-3 border-2 border-zinc-300 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex flex-wrap justify-center gap-6 shadow-inner">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="ant_alergico" checked={formData.ant_alergico} onChange={handleInputChange} disabled={isViewMode} className="w-4 h-4 text-[#2d8f8f]" />
                    <span className="font-semibold text-sm">Alérgico</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="ant_asmatico" checked={formData.ant_asmatico} onChange={handleInputChange} disabled={isViewMode} className="w-4 h-4 text-[#2d8f8f]" />
                    <span className="font-semibold text-sm">Asmático</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="ant_reuma" checked={formData.ant_reuma} onChange={handleInputChange} disabled={isViewMode} className="w-4 h-4 text-[#2d8f8f]" />
                    <span className="font-semibold text-sm">Reuma</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="ant_gota" checked={formData.ant_gota} onChange={handleInputChange} disabled={isViewMode} className="w-4 h-4 text-[#2d8f8f]" />
                    <span className="font-semibold text-sm">Gota</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="ant_herpes" checked={formData.ant_herpes} onChange={handleInputChange} disabled={isViewMode} className="w-4 h-4 text-[#2d8f8f]" />
                    <span className="font-semibold text-sm">Herpes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="ant_diabetes" checked={formData.ant_diabetes} onChange={handleInputChange} disabled={isViewMode} className="w-4 h-4 text-[#2d8f8f]" />
                    <span className="font-semibold text-sm">Diabetes</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sección: RECETAS ASOCIADAS */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Recetas Generadas</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
              </div>

              <div className="bg-white dark:bg-zinc-800 p-4 rounded border border-zinc-300 dark:border-zinc-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Recetas emitidas en esta consulta.
                  </p>
                  <Link
                    href={`/recetas/nueva?consulta_id=${consultaId}&paciente_id=${formData.paciente_id}`}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Generar Receta
                  </Link>
                </div>

                {recetasAsociadas.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recetasAsociadas.map((receta) => (
                      <div key={receta.id} className="border border-zinc-200 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-sm">
                            {new Date(receta.fecha).toLocaleDateString("es-AR")}
                          </span>
                          <Link
                            href={`/recetas/${receta.id}?mode=view`}
                            className="text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 text-sm font-medium"
                          >
                            Ver detalle
                          </Link>
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                          <span className="font-medium">Medicamentos:</span> {receta.medicamentos}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-500 dark:text-zinc-400 text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                    No hay recetas asociadas a esta consulta.
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="mt-8 flex justify-end gap-4 border-t border-zinc-300 dark:border-zinc-700 pt-6">
              <button 
                type="button" 
                onClick={() => router.back()}
                className="px-6 py-2 border border-zinc-400 dark:border-zinc-600 rounded-lg font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                {isViewMode ? "Volver" : "Cancelar"}
              </button>
              {!isViewMode && (
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-6 py-2 bg-[#2d8f8f] hover:bg-[#1f6b6b] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Guardar Cambios
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}