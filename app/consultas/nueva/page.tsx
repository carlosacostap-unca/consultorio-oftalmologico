"use client";

import { useEffect, useRef, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { appendActivePatientFilter } from "@/lib/patient-merge";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
  numero_documento?: string;
  obra_social: string;
  mutual_id?: string;
  numero_afiliado: string;
  fecha_nacimiento: string;
  domicilio?: string;
  numero_ficha?: string;
  ant_diabetes?: boolean;
  ant_glaucoma?: boolean;
  ant_maculopatia?: boolean;
  ant_asmatico?: boolean;
  ant_hipertension?: boolean;
  ant_alergico?: boolean;
  ant_reuma?: boolean;
  ant_gota?: boolean;
  ant_herpes?: boolean;
  ant_otra?: string;
  estado_registro?: string;
  fusionado_en_paciente_id?: string;
  expand?: {
    mutual_id?: {
      nombre: string;
    };
  };
}

interface TurnoContext {
  id: string;
  fecha_hora?: string;
  motivo?: string;
  estado?: string;
  tipo?: string;
  paciente_id?: string;
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
  const formRef = useRef<HTMLFormElement | null>(null);
  
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSelectedPatient, setIsLoadingSelectedPatient] = useState(Boolean(searchParams.get('paciente_id')));
  
  // Para auto-completar datos del paciente seleccionado
  const [selectedPacienteData, setSelectedPacienteData] = useState<Paciente | null>(null);
  const [selectedTurnoData, setSelectedTurnoData] = useState<TurnoContext | null>(null);

  // Extraer parámetros de la URL
  const initialPacienteId = searchParams.get('paciente_id') || "";
  const turnoId = searchParams.get('turno_id') || "";

  // Estado inicial del formulario basado en la captura
  const initialFormState = {
    paciente_id: initialPacienteId,
    numero_ficha: "",
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
  const [debouncedPatientSearchQuery, setDebouncedPatientSearchQuery] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);

  const getPacienteDocumento = (paciente: Paciente) => paciente.numero_documento || paciente.dni || "";

  const formatPacienteLabel = (paciente: Paciente) => {
    const documento = getPacienteDocumento(paciente);
    return `${paciente.apellido}, ${paciente.nombre}${documento ? ` - DNI: ${documento}` : ""}${paciente.numero_ficha ? ` - Ficha: ${paciente.numero_ficha}` : ""}`;
  };

  const getPacienteObraSocial = (paciente?: Paciente | null) => paciente?.expand?.mutual_id?.nombre || paciente?.obra_social || "";
  const getAntecedentesFromPaciente = (paciente: Paciente) => ({
    ant_diabetes: paciente.ant_diabetes || false,
    ant_glaucoma: paciente.ant_glaucoma || false,
    ant_maculopatia: paciente.ant_maculopatia || false,
    ant_asmatico: paciente.ant_asmatico || false,
    ant_hipertension: paciente.ant_hipertension || false,
    ant_alergico: paciente.ant_alergico || false,
    ant_reuma: paciente.ant_reuma || false,
    ant_gota: paciente.ant_gota || false,
    ant_herpes: paciente.ant_herpes || false,
    ant_otra: paciente.ant_otra || "",
  });
  const hasAntecedentes = (antecedentes: ReturnType<typeof getAntecedentesFromPaciente>) =>
    antecedentes.ant_diabetes ||
    antecedentes.ant_glaucoma ||
    antecedentes.ant_maculopatia ||
    antecedentes.ant_asmatico ||
    antecedentes.ant_hipertension ||
    antecedentes.ant_alergico ||
    antecedentes.ant_reuma ||
    antecedentes.ant_gota ||
    antecedentes.ant_herpes ||
    antecedentes.ant_otra.trim() !== "";

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatientSearchQuery(patientSearchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [patientSearchQuery]);

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        if (initialPacienteId) {
          setIsLoadingSelectedPatient(true);
          try {
            const paciente = await pb.collection("pacientes").getOne<Paciente>(initialPacienteId, {
              expand: "mutual_id",
            });
            setSelectedPacienteData(paciente);
            setPatientSearchQuery(formatPacienteLabel(paciente));
            setPacientes((prev) => [paciente, ...prev.filter((p) => p.id !== paciente.id)]);
            setFormData((prev) => ({
              ...prev,
              paciente_id: paciente.id,
              numero_ficha: prev.numero_ficha || paciente.numero_ficha || "",
            }));
          } catch (pacienteError) {
            console.error("Error al cargar el paciente seleccionado:", pacienteError);
          } finally {
            setIsLoadingSelectedPatient(false);
          }
        }

        if (turnoId) {
          try {
            const turno = await pb.collection("turnos").getOne<TurnoContext>(turnoId);
            if (turno) {
              setSelectedTurnoData(turno);
              setFormData(prev => ({ 
                ...prev, 
                motivo_consulta: turno.motivo || "",
                paciente_id: turno.paciente_id || prev.paciente_id
              }));
              if (turno.paciente_id && turno.paciente_id !== initialPacienteId) {
                const pacienteTurno = await pb.collection("pacientes").getOne<Paciente>(turno.paciente_id, {
                  expand: "mutual_id",
                });
                setSelectedPacienteData(pacienteTurno);
                setPatientSearchQuery(formatPacienteLabel(pacienteTurno));
                setPacientes((prev) => [pacienteTurno, ...prev.filter((p) => p.id !== pacienteTurno.id)]);
              }
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

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid || formData.paciente_id) {
      return;
    }

    const loadPatientSearchResults = async () => {
      setIsSearchingPatients(true);
      try {
        const filterParts: string[] = [];
        const searchVal = debouncedPatientSearchQuery.toLowerCase().replace(/"/g, '\\"');
        const terms = searchVal.split(/\s+/).filter(term => term.length > 0);

        if (terms.length > 0) {
          const termFilters = terms.map(term => `(nombre ~ "${term}" || apellido ~ "${term}" || numero_documento ~ "${term}" || numero_ficha ~ "${term}")`);
          filterParts.push(`(${termFilters.join(" && ")})`);
        }

        const result = await pb.collection("pacientes").getList<Paciente>(1, 50, {
          sort: "apellido,nombre",
          filter: appendActivePatientFilter(filterParts.join(" && ")),
          expand: "mutual_id",
          requestKey: null,
        });

        setPacientes(result.items);
      } catch (error) {
        console.error("Error al buscar pacientes:", error);
      } finally {
        setIsSearchingPatients(false);
      }
    };

    loadPatientSearchResults();
  }, [isMounted, formData.paciente_id, debouncedPatientSearchQuery]);

  // Actualizar cabecera de paciente cuando se selecciona uno
  useEffect(() => {
    if (formData.paciente_id) {
      const p = pacientes.find(p => p.id === formData.paciente_id) || null;
      setSelectedPacienteData(p);
      if (p) {
        setPatientSearchQuery(formatPacienteLabel(p));

        const antecedentesPaciente = getAntecedentesFromPaciente(p);
        setFormData(prev => ({
          ...prev,
          numero_ficha: prev.numero_ficha || p.numero_ficha || "",
          ...antecedentesPaciente,
        }));
      }

      // Cargar antecedentes fijos de la ultima consulta solo como respaldo.
      const loadAntecedentes = async () => {
        if (p && hasAntecedentes(getAntecedentesFromPaciente(p))) {
          return;
        }

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
              ant_reuma: lastConsulta.ant_reuma || false,
              ant_gota: lastConsulta.ant_gota || false,
              ant_herpes: lastConsulta.ant_herpes || false,
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
      
      // Si venimos desde un turno, lo actualizamos para enlazarlo y marcarlo como Atendido
      if (turnoId) {
        try {
          await pb.collection("turnos").update(turnoId, {
            consulta_id: nuevaConsulta.id,
            estado: "Atendido"
          });
        } catch (turnoError: any) {
          console.error("Error al actualizar el turno:", turnoError);
          alert(`La consulta se guardó, pero hubo un error al enlazarla con el turno. Detalle: ${turnoError?.message || 'Error desconocido'}. Verifica que el campo 'consulta_id' exista y sea de tipo relación simple.`);
        }
      }

      router.push(initialPacienteId ? `/pacientes/${initialPacienteId}?mode=view` : "/consultas");
    } catch (error) {
      console.error("Error al crear consulta:", error);
      alert("Error al guardar. Verifica que la colección 'consultas' exista con los campos correspondientes.");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (k !== "ArrowRight" && k !== "ArrowLeft" && k !== "ArrowUp" && k !== "ArrowDown") return;
    const formEl = formRef.current;
    if (!formEl) return;
    const focusables = Array.from(
      formEl.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      )
    ).filter(el => el.tabIndex !== -1 && el.offsetParent !== null);
    const target = e.target as HTMLElement;
    const idx = focusables.findIndex(el => el === target);
    if (idx === -1) return;
    e.preventDefault();
    const nextIdx = k === "ArrowRight" || k === "ArrowDown" ? Math.min(idx + 1, focusables.length - 1) : Math.max(idx - 1, 0);
    focusables[nextIdx].focus();
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

  const pacienteNombre = selectedPacienteData
    ? `${selectedPacienteData.apellido}, ${selectedPacienteData.nombre}`
    : formData.paciente_id
      ? "Paciente seleccionado"
      : "Sin paciente seleccionado";

  const patientSummaryItems = selectedPacienteData
    ? [
        selectedPacienteData.numero_ficha ? `Ficha ${selectedPacienteData.numero_ficha}` : "",
        getPacienteDocumento(selectedPacienteData) ? `DNI ${getPacienteDocumento(selectedPacienteData)}` : "",
        selectedPacienteData.fecha_nacimiento ? `${calcularEdad(selectedPacienteData.fecha_nacimiento)} anos` : "",
        getPacienteObraSocial(selectedPacienteData),
      ].filter(Boolean)
    : [];

  const activeAntecedentes = [
    formData.ant_diabetes ? "Diabetes" : "",
    formData.ant_glaucoma ? "Glaucoma" : "",
    formData.ant_maculopatia ? "Maculopatia" : "",
    formData.ant_asmatico ? "Asma" : "",
    formData.ant_hipertension ? "Hipertension" : "",
    formData.ant_alergico ? "Alergia" : "",
    formData.ant_reuma ? "Reuma" : "",
    formData.ant_gota ? "Gota" : "",
    formData.ant_herpes ? "Herpes" : "",
    formData.ant_otra?.trim() || "",
  ].filter(Boolean);

  const turnoDateLabel = selectedTurnoData?.fecha_hora
    ? new Date(selectedTurnoData.fecha_hora).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-[1500px] mx-auto">
        
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
            <p className="text-zinc-500 dark:text-zinc-400">Registrar atencion medica</p>
          </div>
        </div>

        {/* Contenedor del Formulario */}
        <div className="bg-[#f0f0f0] dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
          
          {/* Header del Formulario */}
          <div className="bg-[#2d8f8f] dark:bg-emerald-800 text-white p-3 border-b-4 border-[#1f6b6b] dark:border-emerald-950 shadow-inner">
            <h2 className="text-2xl font-bold italic tracking-wide text-center w-full shadow-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              Historia clinica de atencion
            </h2>
          </div>
          
          <form ref={formRef} onKeyDown={handleKeyDown} onSubmit={handleSubmit} className="p-4 sm:p-6 text-sm text-zinc-900 dark:text-zinc-100 font-sans">
            <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
              <section className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8f8f] dark:text-emerald-400">Resumen del paciente</p>
                    <h3 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{pacienteNombre}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {patientSummaryItems.length > 0 ? patientSummaryItems.map((item) => (
                        <span key={item} className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium dark:bg-zinc-900">
                          {item}
                        </span>
                      )) : (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium dark:bg-zinc-900">Busca o selecciona un paciente</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Domicilio</div>
                    <div className="mt-1">{selectedPacienteData?.domicilio || "Sin domicilio cargado"}</div>
                  </div>
                </div>
              </section>

              <aside className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8f8f] dark:text-emerald-400">Atencion actual</p>
                {selectedTurnoData ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Consulta desde turno</div>
                    <div className="text-zinc-600 dark:text-zinc-300">{turnoDateLabel || "Sin fecha de turno"}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {selectedTurnoData.tipo && <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{selectedTurnoData.tipo}</span>}
                      {selectedTurnoData.estado && <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{selectedTurnoData.estado}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Consulta manual sin turno asociado.</div>
                )}
                <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Antecedentes activos</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeAntecedentes.length > 0 ? activeAntecedentes.map((item) => (
                      <span key={item} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        {item}
                      </span>
                    )) : (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Sin antecedentes activos.</span>
                    )}
                  </div>
                </div>
              </aside>
            </div>

            {/* Sección: DATOS DEL PACIENTE */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Carga inicial del paciente</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white dark:bg-zinc-800 p-3 rounded border border-zinc-300 dark:border-zinc-700 shadow-sm">
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-xs font-semibold mb-1">Paciente:</label>
                  <div className="relative">
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
                      placeholder={isLoadingSelectedPatient ? "Cargando datos del paciente..." : "Buscar por nombre, apellido, documento o ficha..."}
                      className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f] ${isLoadingSelectedPatient ? "animate-pulse" : ""}`}
                    />
                    {showPatientDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-lg max-h-72 overflow-y-auto">
                        {isSearchingPatients ? (
                          <div className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                            Buscando pacientes...
                          </div>
                        ) : pacientes.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                            No se encontraron pacientes.
                          </div>
                        ) : (
                          pacientes.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              className="block w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, paciente_id: p.id }));
                                setPatientSearchQuery(formatPacienteLabel(p));
                                setShowPatientDropdown(false);
                              }}
                            >
                              <div className="font-bold">{p.apellido}, {p.nombre}</div>
                              <div className="text-xs text-zinc-500">DNI: {getPacienteDocumento(p) || "-"} {p.numero_ficha ? `| Ficha: ${p.numero_ficha}` : ''}</div>
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => router.push("/pacientes/nuevo")}
                          className="w-full border-t border-zinc-200 px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-zinc-700 dark:text-blue-300 dark:hover:bg-blue-500/10"
                        >
                          Registrar paciente nuevo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {isLoadingSelectedPatient && (
                  <div className="col-span-12 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    Cargando datos del paciente seleccionado...
                  </div>
                )}
                <div className="col-span-4 md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Edad</label>
                  <div className="flex items-center gap-1">
                    <input type="text" readOnly value={selectedPacienteData ? calcularEdad(selectedPacienteData.fecha_nacimiento) : ""} className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-center ${isLoadingSelectedPatient ? "animate-pulse" : ""}`} />
                    <span className="text-xs">Años</span>
                  </div>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Nº Ficha</label>
                  <input 
                    type="text" 
                    name="numero_ficha"
                    value={formData.numero_ficha || ""} 
                    onChange={handleInputChange}
                    className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none ${isLoadingSelectedPatient ? "animate-pulse" : ""}`}
                  />
                </div>
                <div className="col-span-4 md:col-span-3">
                  <label className="block text-xs font-semibold mb-1">Obra Social</label>
                  <input type="text" readOnly value={getPacienteObraSocial(selectedPacienteData)} className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 ${isLoadingSelectedPatient ? "animate-pulse" : ""}`} />
                </div>
                <div className="col-span-12">
                  <label className="block text-xs font-semibold mb-1">Domicilio</label>
                  <input type="text" readOnly value={selectedPacienteData?.domicilio || ""} className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 ${isLoadingSelectedPatient ? "animate-pulse" : ""}`} />
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_reuma" checked={formData.ant_reuma} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">REUMA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_gota" checked={formData.ant_gota} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">GOTA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ant_herpes" checked={formData.ant_herpes} onChange={handleInputChange} className="w-4 h-4 text-[#2d8f8f]" />
                  <span className="font-semibold text-sm">HERPES</span>
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
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Examen y cierre clinico</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
              </div>

              <div className="bg-white dark:bg-zinc-800 p-4 rounded border border-zinc-300 dark:border-zinc-700 shadow-sm space-y-4">
                
                {/* Fecha y Motivo */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-3 flex items-center border-2 border-zinc-400 dark:border-zinc-600 p-1 bg-zinc-100 dark:bg-zinc-900 shadow-inner">
                    <label className="font-bold mr-2 ml-1 text-sm tracking-wide">FECHA:</label>
                    <input required type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} className="w-full px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold text-center focus:outline-none dark:[color-scheme:dark]" />
                  </div>
                  <div className="md:col-span-9 flex items-center gap-2">
                    <label className="font-bold text-sm whitespace-nowrap">MOTIVO DE CONSULTA:</label>
                    <input type="text" name="motivo_consulta" value={formData.motivo_consulta} onChange={handleInputChange} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700 xl:grid-cols-[minmax(300px,0.75fr)_minmax(620px,1.25fr)]">
                  <div className="space-y-4">
                    <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Agudeza visual</h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Sin correccion y con correccion por ojo.</p>
                        </div>
                        <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">/10</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">OD</div>
                          <label className="mb-2 grid grid-cols-[1fr_88px] items-center gap-2 text-sm font-semibold">
                            AV S/C
                            <input type="text" name="av_sc_od" value={formData.av_sc_od} onChange={handleInputChange} placeholder="0" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          </label>
                          <label className="grid grid-cols-[1fr_88px] items-center gap-2 text-sm font-semibold">
                            AV C/C
                            <input type="text" name="av_cc_od" value={formData.av_cc_od} onChange={handleInputChange} placeholder="0" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          </label>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">OI</div>
                          <label className="mb-2 grid grid-cols-[1fr_88px] items-center gap-2 text-sm font-semibold">
                            AV S/C
                            <input type="text" name="av_sc_oi" value={formData.av_sc_oi} onChange={handleInputChange} placeholder="0" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          </label>
                          <label className="grid grid-cols-[1fr_88px] items-center gap-2 text-sm font-semibold">
                            AV C/C
                            <input type="text" name="av_cc_oi" value={formData.av_cc_oi} onChange={handleInputChange} placeholder="0" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          </label>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Presion ocular</h4>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-950">
                          OD
                          <input type="text" name="pio_od" value={formData.pio_od} onChange={handleInputChange} placeholder="mmHg" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <span className="text-xs text-zinc-500">mmHg</span>
                        </label>
                        <label className="grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-950">
                          OI
                          <input type="text" name="pio_oi" value={formData.pio_oi} onChange={handleInputChange} placeholder="mmHg" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <span className="text-xs text-zinc-500">mmHg</span>
                        </label>
                      </div>
                    </section>
                  </div>

                  <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Refraccion</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Lejos y cerca con ESF, CIL y EJE para OD/OI.</p>
                      </div>
                      <label className="flex items-center gap-2 rounded-lg border border-[#2d8f8f]/40 bg-white px-3 py-2 text-sm font-bold text-[#2d8f8f] dark:bg-zinc-950 dark:text-emerald-400">
                        ADD
                        <input type="text" name="add_value" value={formData.add_value} maxLength={6} onChange={handleInputChange} placeholder="+0.00" className="w-20 rounded border-2 border-[#2d8f8f] px-2 py-1 text-center font-bold text-zinc-900 dark:border-emerald-500 dark:bg-zinc-900 dark:text-zinc-100" />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                        <div className="mb-3 font-bold text-zinc-900 dark:text-zinc-100">Refraccion de lejos</div>
                        <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] gap-2 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                          <span></span><span>ESF</span><span>CIL</span><span>EJE</span>
                        </div>
                        <div className="mt-2 grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-2">
                          <span className="text-sm font-bold">OD</span>
                          <input type="text" name="ref_lejos_od_esf" value={formData.ref_lejos_od_esf} maxLength={6} onChange={handleInputChange} placeholder="+0.00" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_lejos_od_cil" value={formData.ref_lejos_od_cil} maxLength={6} onChange={handleInputChange} placeholder="-0.00" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_lejos_od_eje" value={formData.ref_lejos_od_eje} maxLength={3} onChange={handleInputChange} placeholder="0" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                        </div>
                        <div className="mt-2 grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-2">
                          <span className="text-sm font-bold">OI</span>
                          <input type="text" name="ref_lejos_oi_esf" value={formData.ref_lejos_oi_esf} maxLength={6} onChange={handleInputChange} placeholder="+0.00" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_lejos_oi_cil" value={formData.ref_lejos_oi_cil} maxLength={6} onChange={handleInputChange} placeholder="-0.00" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_lejos_oi_eje" value={formData.ref_lejos_oi_eje} maxLength={3} onChange={handleInputChange} placeholder="0" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                        </div>
                      </div>

                      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                        <div className="mb-3 font-bold text-zinc-900 dark:text-zinc-100">Refraccion de cerca</div>
                        <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] gap-2 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                          <span></span><span>ESF</span><span>CIL</span><span>EJE</span>
                        </div>
                        <div className="mt-2 grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-2">
                          <span className="text-sm font-bold">OD</span>
                          <input type="text" name="ref_cerca_od_esf" value={formData.ref_cerca_od_esf} maxLength={6} onChange={handleInputChange} placeholder="+0.00" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_cerca_od_cil" value={formData.ref_cerca_od_cil} maxLength={6} onChange={handleInputChange} placeholder="-0.00" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_cerca_od_eje" value={formData.ref_cerca_od_eje} maxLength={3} onChange={handleInputChange} placeholder="0" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                        </div>
                        <div className="mt-2 grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-2">
                          <span className="text-sm font-bold">OI</span>
                          <input type="text" name="ref_cerca_oi_esf" value={formData.ref_cerca_oi_esf} maxLength={6} onChange={handleInputChange} placeholder="+0.00" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_cerca_oi_cil" value={formData.ref_cerca_oi_cil} maxLength={6} onChange={handleInputChange} placeholder="-0.00" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_cerca_oi_eje" value={formData.ref_cerca_oi_eje} maxLength={3} onChange={handleInputChange} placeholder="0" className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {false && (
                  <>
                {/* Columnas: Izquierda (Visión) | Derecha (Anteojos) */}
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.8fr)_minmax(620px,1.2fr)] gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  {/* Columna Izquierda */}
                  <div className="space-y-4">
                    <div className="font-bold mb-2 underline decoration-zinc-400">AV:</div>
                    {/* Agudeza Visual */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">AV S/C OD:</span>
                        <div className="flex items-center gap-1">
                          <input type="text" name="av_sc_od" value={formData.av_sc_od} onChange={handleInputChange} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                          <span>/10</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">AV S/C OI:</span>
                        <div className="flex items-center gap-1">
                          <input type="text" name="av_sc_oi" value={formData.av_sc_oi} onChange={handleInputChange} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                          <span>/10</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">AV C/C OD:</span>
                        <div className="flex items-center gap-1">
                          <input type="text" name="av_cc_od" value={formData.av_cc_od} onChange={handleInputChange} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                          <span>/10</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">AV C/C OI:</span>
                        <div className="flex items-center gap-1">
                          <input type="text" name="av_cc_oi" value={formData.av_cc_oi} onChange={handleInputChange} className="w-12 px-1 py-1 border border-zinc-400 text-center" />
                          <span>/10</span>
                        </div>
                      </div>
                    </div>
                    {/* Presión Ocular */}
                    <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-2 border border-zinc-300 dark:border-zinc-700">
                      <span className="font-bold text-sm min-w-[150px]">PRESION OCULAR:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">OD:</span>
                        <input type="text" name="pio_od" value={formData.pio_od} onChange={handleInputChange} className="w-16 px-1 py-1 border border-zinc-400 text-center" />
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="font-semibold text-xs">OI:</span>
                        <input type="text" name="pio_oi" value={formData.pio_oi} onChange={handleInputChange} className="w-16 px-1 py-1 border border-zinc-400 text-center" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Columna Derecha: Anteojos (Refracción Lejos/Cerca + ADD) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 xl:col-span-1">
                    {/* LEJOS */}
                    <div className="p-3 border-b lg:border-b-0 lg:border-r border-zinc-300 dark:border-zinc-700">
                      <div className="font-bold mb-2 underline decoration-zinc-400">ANTEOJOS - LEJOS:</div>
                      <div className="grid grid-cols-[130px,1fr,1fr,1fr] gap-2 mb-2 items-center">
                        <div className="text-right font-bold text-xs pr-2 whitespace-nowrap">OD:</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">ESF.</span>
                          <input type="text" name="ref_lejos_od_esf" value={formData.ref_lejos_od_esf} maxLength={6} onChange={handleInputChange} className="w-16 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">CIL.</span>
                          <input type="text" name="ref_lejos_od_cil" value={formData.ref_lejos_od_cil} maxLength={6} onChange={handleInputChange} className="w-16 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">GRADO</span>
                          <input type="text" name="ref_lejos_od_eje" value={formData.ref_lejos_od_eje} maxLength={3} onChange={handleInputChange} className="w-14 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                      </div>
                      <div className="grid grid-cols-[130px,1fr,1fr,1fr] gap-2 items-center">
                        <div className="text-right font-bold text-xs pr-2 whitespace-nowrap">OI:</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">ESF.</span>
                          <input type="text" name="ref_lejos_oi_esf" value={formData.ref_lejos_oi_esf} maxLength={6} onChange={handleInputChange} className="w-16 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">CIL.</span>
                          <input type="text" name="ref_lejos_oi_cil" value={formData.ref_lejos_oi_cil} maxLength={6} onChange={handleInputChange} className="w-16 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">GRADO</span>
                          <input type="text" name="ref_lejos_oi_eje" value={formData.ref_lejos_oi_eje} maxLength={3} onChange={handleInputChange} className="w-14 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                      </div>
                      
                      {/* ADD */}
                      <div className="mt-3 flex justify-end items-center gap-2">
                        <label className="font-bold text-sm text-[#2d8f8f] dark:text-emerald-500">ADD:</label>
                        <input type="text" name="add_value" value={formData.add_value} maxLength={6} onChange={handleInputChange} placeholder="+0.00" className="w-16 border-2 border-[#2d8f8f] dark:border-emerald-500 px-1 py-1 text-center font-bold" />
                      </div>
                    </div>
                    
                    {/* CERCA */}
                    <div className="p-3">
                      <div className="font-bold mb-2 underline decoration-zinc-400">ANTEOJOS - CERCA:</div>
                      <div className="grid grid-cols-[130px,1fr,1fr,1fr] gap-2 mb-2 items-center">
                        <div className="text-right font-bold text-xs pr-2 whitespace-nowrap">OD:</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">ESF.</span>
                          <input type="text" name="ref_cerca_od_esf" value={formData.ref_cerca_od_esf} maxLength={6} onChange={handleInputChange} className="w-16 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">CIL.</span>
                          <input type="text" name="ref_cerca_od_cil" value={formData.ref_cerca_od_cil} maxLength={6} onChange={handleInputChange} className="w-16 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">GRADO</span>
                          <input type="text" name="ref_cerca_od_eje" value={formData.ref_cerca_od_eje} maxLength={3} onChange={handleInputChange} className="w-14 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                      </div>
                      <div className="grid grid-cols-[130px,1fr,1fr,1fr] gap-2 items-center">
                        <div className="text-right font-bold text-xs pr-2 whitespace-nowrap">OI:</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">ESF.</span>
                          <input type="text" name="ref_cerca_oi_esf" value={formData.ref_cerca_oi_esf} maxLength={6} onChange={handleInputChange} className="w-16 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">CIL.</span>
                          <input type="text" name="ref_cerca_oi_cil" value={formData.ref_cerca_oi_cil} maxLength={6} onChange={handleInputChange} className="w-16 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold whitespace-nowrap">GRADO</span>
                          <input type="text" name="ref_cerca_oi_eje" value={formData.ref_cerca_oi_eje} maxLength={3} onChange={handleInputChange} className="w-14 border border-zinc-400 px-1 py-1 text-center" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                  </>
                )}

                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
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
