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
  domicilio?: string;
}

export default function NuevaConsultaPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <NuevaConsultaForm />
    </Suspense>
  );
}

function NuevaConsultaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
    
    add_value: "",

    ref_cerca_od_esf: "", ref_cerca_od_cil: "", ref_cerca_od_eje: "",
    ref_cerca_oi_esf: "", ref_cerca_oi_cil: "", ref_cerca_oi_eje: "",
    
    pio_od: "", pio_oi: "",
    biomicroscopia: "",
    fondo_ojo: "",
    diagnostico: "",
    tratamiento: "",
    
    ant_alergico: false, ant_asmatico: false, ant_reuma: false,
    ant_gota: false, ant_herpes: false, ant_diabetes: false,
    ant_glaucoma: false, ant_maculopatia: false, ant_hipertension: false,
    ant_otra: ""
  };

  const [formData, setFormData] = useState(initialFormState);

  // Estado para la búsqueda de pacientes
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

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
          try {
            const turno = await pb.collection("turnos").getOne(turnoId);
            if (turno) {
              setFormData(prev => ({ 
                ...prev, 
                motivo_consulta: turno.motivo || "",
                paciente_id: turno.paciente_id || prev.paciente_id
              }));
            }
          } catch (turnoError) {
            console.error("Error al cargar turno:", turnoError);
          }
        }
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
      }
    };

    loadData();
  }, [router]);

  // Actualizar cabecera de paciente cuando se selecciona uno
  useEffect(() => {
    if (formData.paciente_id) {
      const p = pacientes.find(p => p.id === formData.paciente_id) || null;
      setSelectedPacienteData(p);
      if (p) {
        setPatientSearchQuery(`${p.apellido}, ${p.nombre} - DNI: ${p.dni}`);
      }

      // Cargar antecedentes fijos de la última consulta del paciente
      const loadAntecedentes = async () => {
        try {
          const lastConsulta = await pb.collection("consultas").getFirstListItem(`paciente_id="${formData.paciente_id}"`, {
            sort: "-created",
          });
          if (lastConsulta) {
            setFormData(prev => ({
              ...prev,
              ant_diabetes: lastConsulta.ant_diabetes || false,
              ant_glaucoma: lastConsulta.ant_glaucoma || false,
              ant_maculopatia: lastConsulta.ant_maculopatia || false,
              ant_asmatico: lastConsulta.ant_asmatico || false,
              ant_hipertension: lastConsulta.ant_hipertension || false,
              ant_alergico: lastConsulta.ant_alergico || false,
              ant_otra: lastConsulta.ant_otra || "",
            }));
          }
        } catch (err) {
          // Si no hay consulta previa, no hacemos nada
        }
      };
      loadAntecedentes();
    } else {
      setSelectedPacienteData(null);
      setPatientSearchQuery("");
    }
  }, [formData.paciente_id, pacientes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'add_value') {
      setFormData((prev) => {
        // Al cambiar ADD, copiamos cilindro y eje de lejos a cerca, y sumamos esfera + ADD
        const addNum = parseFloat(value.replace(',', '.')) || 0;
        const esfOdNum = parseFloat(prev.ref_lejos_od_esf.replace(',', '.')) || 0;
        const esfOiNum = parseFloat(prev.ref_lejos_oi_esf.replace(',', '.')) || 0;
        
        // Función para formatear el número (si es >0 añadir +, si no, dejar como string)
        const formatNum = (num: number) => {
          if (isNaN(num)) return "";
          return num > 0 ? `+${num}` : `${num}`;
        };

        return {
          ...prev,
          add_value: value,
          ref_cerca_od_esf: value !== "" ? formatNum(esfOdNum + addNum) : prev.ref_cerca_od_esf,
          ref_cerca_oi_esf: value !== "" ? formatNum(esfOiNum + addNum) : prev.ref_cerca_oi_esf,
          ref_cerca_od_cil: value !== "" ? prev.ref_lejos_od_cil : prev.ref_cerca_od_cil,
          ref_cerca_od_eje: value !== "" ? prev.ref_lejos_od_eje : prev.ref_cerca_od_eje,
          ref_cerca_oi_cil: value !== "" ? prev.ref_lejos_oi_cil : prev.ref_cerca_oi_cil,
          ref_cerca_oi_eje: value !== "" ? prev.ref_lejos_oi_eje : prev.ref_cerca_oi_eje,
        };
      });
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
      
      const nuevaConsulta = await pb.collection("consultas").create(dataToSave);
      
      // Si venimos desde un turno, lo actualizamos para enlazarlo y marcarlo completado
      if (turnoId) {
        try {
          await pb.collection("turnos").update(turnoId, {
            consulta_id: nuevaConsulta.id,
            estado: "completado"
          });
        } catch (turnoError) {
          console.error("Error al actualizar el turno:", turnoError);
          alert("La consulta se guardó, pero hubo un error al enlazarla con el turno. Verifica que el campo 'consulta_id' (tipo Texto o Relación) exista en la colección 'turnos' de PocketBase.");
        }
      }

      // Redirigir a la lista de consultas al guardar
      router.push("/consultas");
    } catch (error) {
      console.error("Error al crear consulta:", error);
      alert("Error al guardar. Verifica que la colección 'consultas' exista con los campos correspondientes.");
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Nueva Consulta</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Registrar atención médica</p>
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
                <div className="col-span-12 md:col-span-5 relative">
                  <label className="block text-xs font-semibold mb-1">Paciente:</label>
                  <input
                    type="text"
                    value={patientSearchQuery}
                    onChange={(e) => {
                      setPatientSearchQuery(e.target.value);
                      setShowPatientDropdown(true);
                      if (formData.paciente_id) {
                        setFormData(prev => ({ ...prev, paciente_id: "" }));
                      }
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                    placeholder="Buscar por Apellido, Nombre o DNI"
                    className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]"
                  />
                  {showPatientDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-lg max-h-60 overflow-y-auto">
                      {pacientes
                        .filter(p => 
                          p.apellido.toLowerCase().includes(patientSearchQuery.toLowerCase()) || 
                          p.nombre.toLowerCase().includes(patientSearchQuery.toLowerCase()) || 
                          p.dni.includes(patientSearchQuery)
                        )
                        .map(p => (
                          <div
                            key={p.id}
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, paciente_id: p.id }));
                              setPatientSearchQuery(`${p.apellido}, ${p.nombre} - DNI: ${p.dni}`);
                              setShowPatientDropdown(false);
                            }}
                          >
                            <div className="font-bold">{p.apellido}, {p.nombre}</div>
                            <div className="text-xs text-zinc-500">DNI: {p.dni}</div>
                          </div>
                        ))}
                    </div>
                  )}
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
                <div className="col-span-12">
                  <label className="block text-xs font-semibold mb-1">Domicilio</label>
                  <input type="text" readOnly value={selectedPacienteData?.domicilio || ""} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            </div>

            {/* Sección: ANTECEDENTES */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Antecedentes Fijos</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
              </div>
              <div className="p-3 border-2 border-zinc-300 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex flex-wrap items-center gap-6 shadow-inner">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_diabetes" checked={formData.ant_diabetes} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">DIABETES</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_glaucoma" checked={formData.ant_glaucoma} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">GLAUCOMA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_maculopatia" checked={formData.ant_maculopatia} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">MACULOPATIA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_asmatico" checked={formData.ant_asmatico} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">ASMA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_hipertension" checked={formData.ant_hipertension} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">HIPERTENSION</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_alergico" checked={formData.ant_alergico} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">ALERGIA</span>
                </label>
                <div className="flex items-center gap-2 flex-grow">
                  <span className="font-semibold text-sm whitespace-nowrap">OTRA:</span>
                  <input type="text" name="ant_otra" value={formData.ant_otra} onChange={handleInputChange} className="flex-grow px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]" />
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
                    <input required type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold text-center focus:outline-none dark:[color-scheme:dark]" />
                  </div>
                  
                  <div className="flex-grow flex items-center gap-2">
                    <label className="font-bold text-sm whitespace-nowrap">MOTIVO DE CONSULTA:</label>
                    <input type="text" name="motivo_consulta" value={formData.motivo_consulta} onChange={handleInputChange} className="flex-grow px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]" />
                  </div>
                </div>

                {/* Agudeza Visual */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">AGUDEZA VISUAL S/C: OJO DERECHO:</span>
                    <div className="flex items-center gap-1">
                      <input type="text" name="av_sc_od" value={formData.av_sc_od} onChange={handleInputChange} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                      <span>/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">OJO IZQUIERDO:</span>
                    <div className="flex items-center gap-1">
                      <input type="text" name="av_sc_oi" value={formData.av_sc_oi} onChange={handleInputChange} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                      <span>/10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">C/C: OJO DERECHO:</span>
                    <div className="flex items-center gap-1">
                      <input type="text" name="av_cc_od" value={formData.av_cc_od} onChange={handleInputChange} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                      <span>/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">OJO IZQUIERDO:</span>
                    <div className="flex items-center gap-1">
                      <input type="text" name="av_cc_oi" value={formData.av_cc_oi} onChange={handleInputChange} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
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
                      <input type="text" name="ref_lejos_od_esf" value={formData.ref_lejos_od_esf} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_lejos_od_cil" value={formData.ref_lejos_od_cil} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_lejos_od_eje" value={formData.ref_lejos_od_eje} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 items-center">
                      <div className="text-right font-bold text-xs pr-2">OJO IZQUIERDO:</div>
                      <input type="text" name="ref_lejos_oi_esf" value={formData.ref_lejos_oi_esf} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_lejos_oi_cil" value={formData.ref_lejos_oi_cil} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_lejos_oi_eje" value={formData.ref_lejos_oi_eje} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                    </div>
                    
                    {/* ADD */}
                    <div className="mt-3 flex justify-end items-center gap-2">
                      <label className="font-bold text-sm text-[#2d8f8f] dark:text-emerald-500">ADD:</label>
                      <input type="text" name="add_value" value={formData.add_value} onChange={handleInputChange} placeholder="+0.00" className="w-16 border-2 border-[#2d8f8f] dark:border-emerald-500 px-1 py-1 text-center font-bold" />
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
                      <input type="text" name="ref_cerca_od_esf" value={formData.ref_cerca_od_esf} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_cerca_od_cil" value={formData.ref_cerca_od_cil} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_cerca_od_eje" value={formData.ref_cerca_od_eje} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 items-center">
                      <div className="text-right font-bold text-xs pr-2">OJO IZQUIERDO:</div>
                      <input type="text" name="ref_cerca_oi_esf" value={formData.ref_cerca_oi_esf} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_cerca_oi_cil" value={formData.ref_cerca_oi_cil} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                      <input type="text" name="ref_cerca_oi_eje" value={formData.ref_cerca_oi_eje} onChange={handleInputChange} className="w-full border border-zinc-400 px-1 py-1 text-center" />
                    </div>
                  </div>
                </div>

                {/* PIO y Textos Finales */}
                <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-2 border border-zinc-300 dark:border-zinc-700">
                    <span className="font-bold text-sm min-w-[150px]">PRESION OCULAR:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs">OJO DERECHO:</span>
                      <input type="text" name="pio_od" value={formData.pio_od} onChange={handleInputChange} className="w-16 px-1 py-1 border border-zinc-400 text-center" />
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-semibold text-xs">OJO IZQUIERDO:</span>
                      <input type="text" name="pio_oi" value={formData.pio_oi} onChange={handleInputChange} className="w-16 px-1 py-1 border border-zinc-400 text-center" />
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <label className="font-bold text-sm min-w-[150px] pt-1">BIOMICROSCOPIA:</label>
                    <input type="text" name="biomicroscopia" value={formData.biomicroscopia} onChange={handleInputChange} className="flex-grow px-2 py-1 border border-zinc-400 focus:border-[#2d8f8f] focus:outline-none" />
                  </div>

                  <div className="flex gap-2 items-start">
                    <label className="font-bold text-sm min-w-[150px] pt-1">FONDO DE OJO:</label>
                    <input type="text" name="fondo_ojo" value={formData.fondo_ojo} onChange={handleInputChange} className="flex-grow px-2 py-1 border border-zinc-400 focus:border-[#2d8f8f] focus:outline-none" />
                  </div>
                  
                  <div className="flex gap-2 items-start">
                    <label className="font-bold text-sm min-w-[150px] pt-1">DIAGNOSTICO:</label>
                    <input type="text" name="diagnostico" value={formData.diagnostico} onChange={handleInputChange} className="flex-grow px-2 py-1 border border-zinc-400 focus:border-[#2d8f8f] focus:outline-none" />
                  </div>
                  
                  <div className="flex gap-2 items-start">
                    <label className="font-bold text-sm min-w-[150px] pt-1">TRATAMIENTO:</label>
                    <input type="text" name="tratamiento" value={formData.tratamiento} onChange={handleInputChange} className="flex-grow px-2 py-1 border border-zinc-400 focus:border-[#2d8f8f] focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-zinc-300 dark:border-zinc-700">
              <button 
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white font-bold rounded shadow-sm border border-zinc-400 text-center"
              >
                CANCELAR
              </button>
              <button 
                type="submit" 
                disabled={isLoading || !formData.paciente_id}
                className="px-8 py-2 bg-[#2d8f8f] hover:bg-[#1f6b6b] text-white font-bold rounded shadow-md border border-[#1a5c5c] disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? 'GUARDANDO...' : 'GUARDAR CONSULTA'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}