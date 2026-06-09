"use client";

import { useEffect, useRef, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { appendActivePatientFilter } from "@/lib/patient-merge";
import type { ConsultaEstado } from "@/lib/consulta-estado";
import { consultaEstadoLabel } from "@/lib/consulta-estado";
import { normalizeUserRoles } from "@/lib/permissions";
import type { AppUser, Medico } from "@/lib/types";
import { doctorLabel } from "@/lib/doctor-attribution";
import { refractionHasValues } from "@/lib/refraction";
import { activeRoleJsonHeaders, resolveActiveRole } from "@/lib/active-role";
import type { UserRole } from "@/lib/permissions";
import { normalizeOptionalClinicalZeros } from "@/lib/clinical-empty-values";

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
  ocupacion?: string;
  domicilio?: string;
  numero_ficha?: string;
  ant_diabetes?: boolean;
  ant_glaucoma?: boolean;
  ant_maculopatia?: boolean;
  ant_asmatico?: boolean;
  ant_hipertension?: boolean;
  ant_alergico?: boolean;
  ant_reuma?: boolean;
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
  medico_id?: string;
  consulta_id?: string;
}

interface SavedConsultation {
  id: string;
  pacienteId: string;
  returnHref: string;
  returnLabel: string;
  turnoUpdated: boolean;
  estado: ConsultaEstado;
}

interface ClinicalContextConsulta {
  id: string;
  fecha?: string;
  created?: string;
  motivo_consulta?: string;
  diagnostico?: string;
  tratamiento?: string;
}

interface ClinicalContextReceta {
  id: string;
  fecha?: string;
  created?: string;
  consulta_id?: string;
  medicamentos?: string;
  indicaciones?: string;
}

const completedClinicalContextFields = (consulta: ClinicalContextConsulta) =>
  [
    { label: "Diagnostico", value: consulta.diagnostico?.trim() || "" },
    { label: "Tratamiento", value: consulta.tratamiento?.trim() || "" },
  ].filter((field) => field.value.length > 0);

type AntecedenteKey =
  | "ant_diabetes"
  | "ant_glaucoma"
  | "ant_maculopatia"
  | "ant_asmatico"
  | "ant_hipertension"
  | "ant_alergico"
  | "ant_reuma"
  | "ant_herpes";

const antecedentesFijos: Array<{ key: AntecedenteKey; label: string }> = [
  { key: "ant_diabetes", label: "DIABETES" },
  { key: "ant_glaucoma", label: "GLAUCOMA" },
  { key: "ant_maculopatia", label: "MACULOPATIA" },
  { key: "ant_asmatico", label: "ASMA" },
  { key: "ant_hipertension", label: "HIPERTENSION" },
  { key: "ant_alergico", label: "ALERGIA" },
  { key: "ant_reuma", label: "REUMA" },
  { key: "ant_herpes", label: "HERPES" },
];

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
  
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSelectedPatient, setIsLoadingSelectedPatient] = useState(Boolean(searchParams.get('paciente_id')));
  
  // Para auto-completar datos del paciente seleccionado
  const [selectedPacienteData, setSelectedPacienteData] = useState<Paciente | null>(null);
  const [selectedTurnoData, setSelectedTurnoData] = useState<TurnoContext | null>(null);
  const [savedConsultation, setSavedConsultation] = useState<SavedConsultation | null>(null);
  const [recentConsultas, setRecentConsultas] = useState<ClinicalContextConsulta[]>([]);
  const [recentRecetas, setRecentRecetas] = useState<ClinicalContextReceta[]>([]);
  const [isLoadingClinicalContext, setIsLoadingClinicalContext] = useState(false);
  const [clinicalContextError, setClinicalContextError] = useState("");
  const [isClinicalContextOpen, setIsClinicalContextOpen] = useState(false);

  // Extraer parámetros de la URL
  const initialPacienteId = searchParams.get('paciente_id') || "";
  const turnoId = searchParams.get('turno_id') || "";
  const initialMedicoId = searchParams.get('medico_id') || "";

  // Estado inicial del formulario basado en la captura
  const initialFormState = {
    paciente_id: initialPacienteId,
    medico_id: initialMedicoId,
    numero_ficha: "",
    estado: "en_curso" as ConsultaEstado,
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
    ant_herpes: false, ant_diabetes: false,
    ant_glaucoma: false, ant_maculopatia: false, ant_hipertension: false,
    ant_otra: ""
  };

  const [formData, setFormData] = useState(initialFormState);
  const [medicos, setMedicos] = useState<Medico[]>([]);

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
  const formatClinicalDate = (value?: string) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getAntecedentesFromPaciente = (paciente: Paciente) => ({
    ant_diabetes: paciente.ant_diabetes || false,
    ant_glaucoma: paciente.ant_glaucoma || false,
    ant_maculopatia: paciente.ant_maculopatia || false,
    ant_asmatico: paciente.ant_asmatico || false,
    ant_hipertension: paciente.ant_hipertension || false,
    ant_alergico: paciente.ant_alergico || false,
    ant_reuma: paciente.ant_reuma || false,
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
    const authUser = pb.authStore.record as AppUser | null;
    const accountDoctorId = normalizeUserRoles(authUser).includes("medico") ? authUser?.id || "" : "";
    setUser(authUser);
    setActiveRole(resolveActiveRole(authUser, ["medico"]));

    if (accountDoctorId) {
      setFormData((prev) => ({ ...prev, medico_id: accountDoctorId }));
    }

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const medicosResponse = await fetch("/api/medicos", {
          headers: { Authorization: `Bearer ${pb.authStore.token}` },
        });
        if (medicosResponse.ok) {
          const medicosData = await medicosResponse.json();
          setMedicos(Array.isArray(medicosData.medicos) ? medicosData.medicos : []);
        }

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
                paciente_id: turno.paciente_id || prev.paciente_id,
                medico_id: accountDoctorId || turno.medico_id || prev.medico_id,
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

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid || !formData.paciente_id) {
      setRecentConsultas([]);
      setRecentRecetas([]);
      setClinicalContextError("");
      setIsLoadingClinicalContext(false);
      return;
    }

    let shouldIgnore = false;
    const loadClinicalContext = async () => {
      setIsLoadingClinicalContext(true);
      setClinicalContextError("");
      try {
        const filter = `paciente_id = "${formData.paciente_id}"`;
        const [consultasResult, recetasResult] = await Promise.all([
          pb.collection("consultas").getList<ClinicalContextConsulta>(1, 3, {
            filter,
            sort: "-fecha,-created",
            requestKey: null,
          }),
          pb.collection("recetas").getList<ClinicalContextReceta>(1, 3, {
            filter,
            sort: "-fecha,-created",
            requestKey: null,
          }),
        ]);

        if (!shouldIgnore) {
          setRecentConsultas(consultasResult.items);
          setRecentRecetas(recetasResult.items);
        }
      } catch (error) {
        console.error("Error al cargar contexto clinico:", error);
        if (!shouldIgnore) {
          setRecentConsultas([]);
          setRecentRecetas([]);
          setClinicalContextError("No se pudo cargar el contexto clinico previo.");
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoadingClinicalContext(false);
        }
      }
    };

    loadClinicalContext();

    return () => {
      shouldIgnore = true;
    };
  }, [isMounted, formData.paciente_id]);

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
          if (!Number.isFinite(num) || num === 0) return "";
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savedConsultation) return;

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const targetEstado: ConsultaEstado = submitter?.value === "finalizada" ? "finalizada" : "en_curso";
    if (!formData.medico_id) {
      alert("No se pudo definir el medico responsable de la consulta.");
      return;
    }

    setIsLoading(true);
    try {
      // Aseguramos formato ISO para la fecha
      const dataToSave = {
        ...normalizeOptionalClinicalZeros(formData),
        estado: targetEstado,
        fecha: new Date(formData.fecha).toISOString(),
        ant_gota: false,
        turno_id: turnoId || "",
      };

      const response = await fetch("/api/consultas", {
        method: "POST",
        headers: activeRoleJsonHeaders(pb.authStore.token, activeRole),
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "No se pudo crear la consulta");
      }

      const nuevaConsulta = await response.json();
      let turnoUpdated = false;
      const targetTurnoEstado = targetEstado === "finalizada" ? "Atendido" : "En consulta";
      
      // Si venimos desde un turno, lo actualizamos para enlazarlo y marcarlo como Atendido
      if (turnoId) {
        try {
          await pb.collection("turnos").update(turnoId, {
            consulta_id: nuevaConsulta.id,
            estado: targetTurnoEstado
          });
          turnoUpdated = true;
          setSelectedTurnoData((prev) => prev ? { ...prev, consulta_id: nuevaConsulta.id, estado: targetTurnoEstado } : prev);
        } catch (turnoError: any) {
          console.error("Error al actualizar el turno:", turnoError);
          alert(`La consulta se guardó, pero hubo un error al enlazarla con el turno. Detalle: ${turnoError?.message || 'Error desconocido'}. Verifica que el campo 'consulta_id' exista y sea de tipo relación simple.`);
        }
      }

      const patientClinicalRecordHref = `/pacientes/${dataToSave.paciente_id}?mode=view`;
      setSavedConsultation({
        id: nuevaConsulta.id,
        pacienteId: dataToSave.paciente_id,
        returnHref: patientClinicalRecordHref,
        returnLabel: "Ver ficha clinica",
        turnoUpdated,
        estado: targetEstado,
      });
      setIsLoading(false);
      router.push(patientClinicalRecordHref);
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

  const toggleAntecedente = (name: AntecedenteKey) => {
    setFormData((prev) => ({ ...prev, [name]: !prev[name] }));
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
  const accountDoctor = user?.id === formData.medico_id ? user : null;
  const selectedDoctor = medicos.find((medico) => medico.id === formData.medico_id) || accountDoctor;
  const isDoctorFromAccount = Boolean(accountDoctor);

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

  const hasTreatmentForCompletion = formData.tratamiento.trim() !== "";
  const hasRefractionForCompletion = refractionHasValues(formData);
  const completionRecommendation = savedConsultation
    ? hasTreatmentForCompletion
      ? {
          label: "Crear receta",
          href: `/recetas/nueva?consulta_id=${savedConsultation.id}&paciente_id=${savedConsultation.pacienteId}`,
          title: "Tratamiento cargado",
          detail: "La consulta tiene tratamiento indicado. Conviene emitir la receta o indicacion correspondiente.",
        }
      : hasRefractionForCompletion
        ? {
            label: "Imprimir anteojos",
            href: `/consultas/${savedConsultation.id}/imprimir-anteojos`,
            title: "Refraccion cargada",
            detail: "Hay datos de refraccion disponibles para entregar la receta de anteojos.",
          }
        : {
            label: savedConsultation.returnLabel,
            href: savedConsultation.returnHref,
            title: "Atencion finalizada",
            detail: "No hay tratamiento ni refraccion cargada. Podes volver al contexto de trabajo.",
          }
    : null;

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 p-3 dark:bg-zinc-950 sm:p-4">
      <div className="mx-auto max-w-[1760px]">
        {/* Contenedor del Formulario */}
        <div className="bg-[#f0f0f0] dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
          
          {/* Header del Formulario */}
          <div className="relative border-b-4 border-[#1f6b6b] bg-[#2d8f8f] p-2 text-white shadow-inner dark:border-emerald-950 dark:bg-emerald-800">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Volver"
              title="Volver"
              className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
            <h2 className="w-full text-center text-xl font-bold italic tracking-wide shadow-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              Historia clinica de atencion
            </h2>
            <button
              type="button"
              onClick={() => setIsClinicalContextOpen((prev) => !prev)}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/20 2xl:inline-flex"
              aria-expanded={isClinicalContextOpen}
              aria-controls="clinical-context-overlay"
            >
              {isClinicalContextOpen ? "Ocultar contexto" : "Ver contexto"}
            </button>
          </div>
          
          <form ref={formRef} onKeyDown={handleKeyDown} onSubmit={handleSubmit} className="p-3 font-sans text-sm text-zinc-900 dark:text-zinc-100">
            {savedConsultation && completionRecommendation && (
              <section aria-label="Cierre de consulta" className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      {savedConsultation.estado === "finalizada" ? "Consulta finalizada correctamente" : "Avance guardado correctamente"}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {savedConsultation.turnoUpdated
                        ? `Consulta ${consultaEstadoLabel(savedConsultation.estado).toLowerCase()} y turno actualizado`
                        : `La consulta quedo ${consultaEstadoLabel(savedConsultation.estado).toLowerCase()}`}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {savedConsultation.turnoUpdated
                        ? `El turno fue marcado como ${savedConsultation.estado === "finalizada" ? "Atendido" : "En consulta"}.`
                        : "Podes continuar con una accion relacionada o volver al contexto anterior."}
                    </p>
                  </div>

                  <div className="grid w-full gap-3 xl:max-w-3xl xl:grid-cols-[minmax(240px,0.9fr)_minmax(280px,1.1fr)]">
                    <div className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-zinc-950">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Accion recomendada</p>
                      <h4 className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">{completionRecommendation.title}</h4>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{completionRecommendation.detail}</p>
                      <Link href={completionRecommendation.href} className="mt-4 inline-flex rounded-lg bg-[#2d8f8f] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#1f6b6b]">
                        {completionRecommendation.label}
                      </Link>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Otras acciones</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/consultas/${savedConsultation.id}`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                          Abrir consulta
                        </Link>
                        <Link href={`/pacientes/${savedConsultation.pacienteId}?mode=view`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                          Ficha del paciente
                        </Link>
                        {!hasTreatmentForCompletion && (
                          <Link href={`/recetas/nueva?consulta_id=${savedConsultation.id}&paciente_id=${savedConsultation.pacienteId}`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                            Crear receta
                          </Link>
                        )}
                        {!hasRefractionForCompletion && (
                          <Link href={`/consultas/${savedConsultation.id}/imprimir-anteojos`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                            Imprimir anteojos
                          </Link>
                        )}
                        <Link href={savedConsultation.returnHref} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                          {savedConsultation.returnLabel}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] 2xl:hidden">
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
                </div>
              </section>

              <aside className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8f8f] dark:text-emerald-400">Atencion actual</p>
                {selectedTurnoData ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Turno asociado</div>
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

            {/* Sección: CONTEXTO CLINICO */}
            <section aria-label="Contexto clinico del paciente" className="mb-4 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 2xl:hidden">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8f8f] dark:text-emerald-400">Contexto clinico del paciente</p>
                  <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Continuidad para la atencion actual</h3>
                  <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Domicilio</div>
                    <div className="mt-1">{selectedPacienteData?.domicilio || "Sin domicilio cargado"}</div>
                  </div>
                </div>
                {formData.paciente_id && (
                  <Link
                    href={`/pacientes/${formData.paciente_id}?mode=view`}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    Ver ficha completa
                  </Link>
                )}
              </div>

              {!formData.paciente_id ? (
                <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                  Selecciona un paciente para ver sus consultas y recetas recientes.
                </div>
              ) : isLoadingClinicalContext ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                  <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                  Cargando contexto clinico previo...
                </div>
              ) : clinicalContextError ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {clinicalContextError}
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Ultimas consultas</h4>
                      <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{recentConsultas.length}</span>
                    </div>
                    {recentConsultas.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No hay consultas registradas.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {recentConsultas.map((consulta) => {
                          const visibleFields = completedClinicalContextFields(consulta);
                          return (
                            <article key={consulta.id} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">{formatClinicalDate(consulta.fecha || consulta.created)}</div>
                                  {consulta.motivo_consulta?.trim() && (
                                    <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{consulta.motivo_consulta}</div>
                                  )}
                                </div>
                                <Link href={`/consultas/${consulta.id}?mode=view`} className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">
                                  Abrir
                                </Link>
                              </div>
                              {visibleFields.length > 0 && (
                                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                                  {visibleFields.map((field) => (
                                    <div key={field.label}>
                                      <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-500">{field.label}</dt>
                                      <dd className="mt-1">{field.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Recetas recientes</h4>
                      <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{recentRecetas.length}</span>
                    </div>
                    {recentRecetas.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No hay recetas registradas.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {recentRecetas.map((receta) => (
                          <article key={receta.id} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">{formatClinicalDate(receta.fecha || receta.created)}</div>
                                <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{receta.medicamentos || "Sin medicamentos registrados"}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Link href={`/recetas/${receta.id}?mode=view`} className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">
                                  Abrir
                                </Link>
                                {receta.consulta_id && (
                                  <Link href={`/consultas/${receta.consulta_id}?mode=view`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                                    Consulta
                                  </Link>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                              <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-500">Indicaciones</div>
                              <p className="mt-1">{receta.indicaciones || "-"}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {isClinicalContextOpen && (
            <aside id="clinical-context-overlay" className="fixed right-6 top-[112px] z-30 hidden w-[430px] overflow-y-auto rounded-xl border border-zinc-300 bg-white p-3 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 2xl:block 2xl:max-h-[calc(100vh-136px)]" aria-label="Panel de contexto de la consulta">
              <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8f8f] dark:text-emerald-400">Paciente</p>
                <h3 className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-100">{pacienteNombre}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {patientSummaryItems.length > 0 ? patientSummaryItems.map((item) => (
                    <span key={item} className="rounded-full bg-white px-2 py-1 font-medium dark:bg-zinc-900">{item}</span>
                  )) : (
                    <span className="rounded-full bg-white px-2 py-1 font-medium dark:bg-zinc-900">Busca o selecciona un paciente</span>
                  )}
                </div>
                <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">Domicilio</div>
                  <div className="mt-1">{selectedPacienteData?.domicilio || "Sin domicilio cargado"}</div>
                </div>
              </section>

              <section className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8f8f] dark:text-emerald-400">Atencion actual</p>
                  <button
                    type="button"
                    onClick={() => setIsClinicalContextOpen(false)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Cerrar
                  </button>
                </div>
                {selectedTurnoData ? (
                  <div className="mt-2 text-sm">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Turno asociado</div>
                    <div className="mt-1 text-zinc-600 dark:text-zinc-300">{turnoDateLabel || "Sin fecha de turno"}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {selectedTurnoData.tipo && <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{selectedTurnoData.tipo}</span>}
                      {selectedTurnoData.estado && <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{selectedTurnoData.estado}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Consulta manual sin turno asociado.</div>
                )}
                <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Antecedentes activos</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeAntecedentes.length > 0 ? activeAntecedentes.map((item) => (
                      <span key={item} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{item}</span>
                    )) : (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Sin antecedentes activos.</span>
                    )}
                  </div>
                </div>
              </section>

              <section aria-label="Contexto lateral del paciente" className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8f8f] dark:text-emerald-400">Contexto clinico</p>
                    <h3 className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-100">Continuidad</h3>
                  </div>
                  {formData.paciente_id && (
                    <Link href={`/pacientes/${formData.paciente_id}?mode=view`} className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      Ver ficha
                    </Link>
                  )}
                </div>

                {!formData.paciente_id ? (
                  <div className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">Selecciona un paciente para ver su historia reciente.</div>
                ) : isLoadingClinicalContext ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    Cargando contexto...
                  </div>
                ) : clinicalContextError ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">{clinicalContextError}</div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Ultimas consultas</h4>
                        <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{recentConsultas.length}</span>
                      </div>
                      {recentConsultas.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No hay consultas registradas.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {recentConsultas.map((consulta) => {
                            const visibleFields = completedClinicalContextFields(consulta);
                            return (
                              <article key={consulta.id} className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">{formatClinicalDate(consulta.fecha || consulta.created)}</div>
                                    {consulta.motivo_consulta?.trim() && (
                                      <div className="mt-1 truncate font-semibold text-zinc-900 dark:text-zinc-100">{consulta.motivo_consulta}</div>
                                    )}
                                  </div>
                                  <Link href={`/consultas/${consulta.id}?mode=view`} className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">Abrir</Link>
                                </div>
                                {visibleFields.length > 0 && (
                                  <div className={`mt-2 grid gap-2 text-xs text-zinc-600 dark:text-zinc-400 ${visibleFields.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                                    {visibleFields.map((field) => (
                                      <div key={field.label}>
                                        <div className="font-semibold uppercase text-zinc-500 dark:text-zinc-500">{field.label}</div>
                                        <div className="mt-0.5 line-clamp-2">{field.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Recetas recientes</h4>
                        <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{recentRecetas.length}</span>
                      </div>
                      {recentRecetas.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No hay recetas registradas.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {recentRecetas.map((receta) => (
                            <article key={receta.id} className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">{formatClinicalDate(receta.fecha || receta.created)}</div>
                                  <div className="mt-1 truncate font-semibold text-zinc-900 dark:text-zinc-100">{receta.medicamentos || "Sin medicamentos registrados"}</div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <Link href={`/recetas/${receta.id}?mode=view`} className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">Abrir</Link>
                                  {receta.consulta_id && (
                                    <Link href={`/consultas/${receta.consulta_id}?mode=view`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">Consulta</Link>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                                <div className="font-semibold uppercase text-zinc-500 dark:text-zinc-500">Indicaciones</div>
                                <p className="mt-0.5 line-clamp-2">{receta.indicaciones || "-"}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </aside>
            )}

            {/* Sección: DATOS DEL PACIENTE */}
            <div className="mb-3">
              <div className="mb-1.5 flex items-center">
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Carga inicial del paciente</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
              </div>
              
              <div className="grid grid-cols-1 items-end gap-3 rounded border border-zinc-300 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 md:grid-cols-12">
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
                <div className="col-span-6 md:col-span-1">
                  <label className="block text-xs font-semibold mb-1">Edad</label>
                  <div className="[&>span]:hidden">
                    <input type="text" readOnly value={selectedPacienteData ? calcularEdad(selectedPacienteData.fecha_nacimiento) : ""} className={`w-16 max-w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-center ${isLoadingSelectedPatient ? "animate-pulse" : ""}`} />
                    <span className="text-xs">Años</span>
                  </div>
                </div>
                <div className="hidden">
                  <label className="block text-xs font-semibold mb-1">Nº Ficha</label>
                  <input 
                    type="text" 
                    name="numero_ficha"
                    value={formData.numero_ficha || ""} 
                    onChange={handleInputChange}
                    className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none ${isLoadingSelectedPatient ? "animate-pulse" : ""}`}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6 md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Obra Social</label>
                  <input type="text" readOnly value={getPacienteObraSocial(selectedPacienteData)} className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 ${isLoadingSelectedPatient ? "animate-pulse" : ""}`} />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-xs font-semibold mb-1">Domicilio</label>
                  <input type="text" readOnly value={selectedPacienteData?.domicilio || ""} className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 ${isLoadingSelectedPatient ? "animate-pulse" : ""}`} />
                </div>
                <div className="col-span-12 sm:col-span-6 md:col-span-1">
                  <label className="block text-xs font-semibold mb-1">Ocupacion</label>
                  <input type="text" aria-label="Ocupacion" readOnly value={selectedPacienteData?.ocupacion || ""} className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 ${isLoadingSelectedPatient ? "animate-pulse" : ""}`} />
                </div>
                <div className="col-span-12 flex flex-wrap items-center gap-2 rounded-xl border-2 border-zinc-300 bg-zinc-50 p-2.5 shadow-inner dark:border-zinc-600 dark:bg-zinc-800">
                  {antecedentesFijos.map((antecedente) => {
                    const isSelected = formData[antecedente.key];

                    return (
                      <button
                        key={antecedente.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleAntecedente(antecedente.key)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                          isSelected
                            ? "border-[#2d8f8f] bg-[#2d8f8f] text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600"
                            : "border-zinc-300 bg-white text-zinc-700 hover:border-[#2d8f8f] hover:text-[#1f6b6b] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                        }`}
                      >
                        {antecedente.label}
                      </button>
                    );
                  })}
                  <div className="flex min-w-[260px] flex-grow items-center gap-2">
                    <span className="font-semibold text-sm whitespace-nowrap">OTRA:</span>
                    <input type="text" name="ant_otra" value={formData.ant_otra} onChange={handleInputChange} className="flex-grow px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: ANTECEDENTES */}
            <div className="hidden">
              <div className="hidden">
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Antecedentes Fijos</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-zinc-300 bg-zinc-50 p-2.5 shadow-inner dark:border-zinc-600 dark:bg-zinc-800">
                {antecedentesFijos.map((antecedente) => {
                  const isSelected = formData[antecedente.key];

                  return (
                    <button
                      key={antecedente.key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleAntecedente(antecedente.key)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                        isSelected
                          ? "border-[#2d8f8f] bg-[#2d8f8f] text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-[#2d8f8f] hover:text-[#1f6b6b] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                      }`}
                    >
                      {antecedente.label}
                    </button>
                  );
                })}
                <div className="flex min-w-[260px] flex-grow items-center gap-2">
                  <span className="font-semibold text-sm whitespace-nowrap">OTRA:</span>
                  <input type="text" name="ant_otra" value={formData.ant_otra} onChange={handleInputChange} className="flex-grow px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]" />
                </div>
              </div>
            </div>

            {/* Sección: DATOS MEDICOS */}
            <div className="mb-3">
              <div className="mb-1.5 flex items-center gap-2">
                <h3 className="text-[#1f6b6b] dark:text-emerald-500 font-bold uppercase mr-2 whitespace-nowrap">Examen y cierre clinico</h3>
                <div className="h-px bg-[#1f6b6b] dark:bg-emerald-500 flex-grow"></div>
                <div className="whitespace-nowrap text-xs font-semibold text-[#1f6b6b] dark:text-emerald-500">
                  Medico responsable: <span className="font-bold">{doctorLabel(selectedDoctor)}</span>
                </div>
              </div>

              <div className="space-y-3 rounded border border-zinc-300 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                
                <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                    <label className="grid max-w-[220px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-sm font-bold">
                      Fecha
                      <input
                        required
                        type="date"
                        name="fecha"
                        value={formData.fecha}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 font-bold text-zinc-900 outline-none transition focus:border-[#2d8f8f] focus:ring-2 focus:ring-[#2d8f8f]/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:[color-scheme:dark]"
                      />
                    </label>
                    <label className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-base font-bold">
                      <span>Motivo</span>
                      <textarea
                        name="motivo_consulta"
                        value={formData.motivo_consulta}
                        onChange={handleInputChange}
                        rows={1}
                        placeholder="Motivo principal de la atencion..."
                        className="min-h-10 w-full flex-1 resize-y rounded-lg border-2 border-zinc-400 bg-white px-3 py-2 text-base font-semibold text-zinc-900 outline-none transition focus:border-[#2d8f8f] focus:ring-2 focus:ring-[#2d8f8f]/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-700 xl:grid-cols-[minmax(280px,0.68fr)_minmax(0,1.32fr)]">
                  <div className="min-w-0">
                    <section className="h-full rounded-xl border border-zinc-300 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
                      <h4 className="mb-2 text-center text-base font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Agudeza visual</h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950">
                          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">OD</div>
                          <label className="mb-2 grid grid-cols-[1fr_88px] items-center gap-2 text-sm font-semibold">
                            AV S/C
                            <input type="text" name="av_sc_od" value={formData.av_sc_od} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          </label>
                          <label className="grid grid-cols-[1fr_88px] items-center gap-2 text-sm font-semibold">
                            AV C/C
                            <input type="text" name="av_cc_od" value={formData.av_cc_od} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          </label>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950">
                          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">OI</div>
                          <label className="mb-2 grid grid-cols-[1fr_88px] items-center gap-2 text-sm font-semibold">
                            AV S/C
                            <input type="text" name="av_sc_oi" value={formData.av_sc_oi} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          </label>
                          <label className="grid grid-cols-[1fr_88px] items-center gap-2 text-sm font-semibold">
                            AV C/C
                            <input type="text" name="av_cc_oi" value={formData.av_cc_oi} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          </label>
                        </div>
                      </div>
                    </section>

                  </div>

                  <section className="h-full rounded-xl border border-zinc-300 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
                    <h4 className="mb-2 text-center text-base font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Refraccion</h4>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
                      <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950">
                        <div className="mb-2 font-bold text-zinc-900 dark:text-zinc-100">Refraccion de lejos</div>
                        <div className="grid grid-cols-[44px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] gap-2 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                          <span></span><span>ESF</span><span>CIL</span><span>EJE</span>
                        </div>
                        <div className="mt-2 grid grid-cols-[44px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2">
                          <span className="text-sm font-bold">OD</span>
                          <input type="text" name="ref_lejos_od_esf" value={formData.ref_lejos_od_esf} maxLength={7} onChange={handleInputChange} className="w-full min-w-0 rounded border border-zinc-400 px-2 py-1 text-center text-sm font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_lejos_od_cil" value={formData.ref_lejos_od_cil} maxLength={7} onChange={handleInputChange} className="w-full min-w-0 rounded border border-zinc-400 px-2 py-1 text-center text-sm font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_lejos_od_eje" value={formData.ref_lejos_od_eje} maxLength={3} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                        </div>
                        <div className="mt-2 grid grid-cols-[44px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2">
                          <span className="text-sm font-bold">OI</span>
                          <input type="text" name="ref_lejos_oi_esf" value={formData.ref_lejos_oi_esf} maxLength={7} onChange={handleInputChange} className="w-full min-w-0 rounded border border-zinc-400 px-2 py-1 text-center text-sm font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_lejos_oi_cil" value={formData.ref_lejos_oi_cil} maxLength={7} onChange={handleInputChange} className="w-full min-w-0 rounded border border-zinc-400 px-2 py-1 text-center text-sm font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_lejos_oi_eje" value={formData.ref_lejos_oi_eje} maxLength={3} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                        </div>
                      </div>

                      <label className="flex items-center justify-center gap-2 rounded-lg border border-[#2d8f8f]/40 bg-white px-3 py-2 text-sm font-bold text-[#2d8f8f] dark:bg-zinc-950 dark:text-emerald-400 lg:flex-col lg:px-2">
                        ADD
                        <input type="text" name="add_value" value={formData.add_value} maxLength={7} onChange={handleInputChange} className="w-20 rounded border-2 border-[#2d8f8f] px-2 py-1 text-center text-sm font-bold tabular-nums text-zinc-900 dark:border-emerald-500 dark:bg-zinc-900 dark:text-zinc-100" />
                      </label>

                      <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950">
                        <div className="mb-2 font-bold text-zinc-900 dark:text-zinc-100">Refraccion de cerca</div>
                        <div className="grid grid-cols-[44px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] gap-2 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                          <span></span><span>ESF</span><span>CIL</span><span>EJE</span>
                        </div>
                        <div className="mt-2 grid grid-cols-[44px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2">
                          <span className="text-sm font-bold">OD</span>
                          <input type="text" name="ref_cerca_od_esf" value={formData.ref_cerca_od_esf} maxLength={7} onChange={handleInputChange} className="w-full min-w-0 rounded border border-zinc-400 px-2 py-1 text-center text-sm font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_cerca_od_cil" value={formData.ref_cerca_od_cil} maxLength={7} onChange={handleInputChange} className="w-full min-w-0 rounded border border-zinc-400 px-2 py-1 text-center text-sm font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_cerca_od_eje" value={formData.ref_cerca_od_eje} maxLength={3} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                        </div>
                        <div className="mt-2 grid grid-cols-[44px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2">
                          <span className="text-sm font-bold">OI</span>
                          <input type="text" name="ref_cerca_oi_esf" value={formData.ref_cerca_oi_esf} maxLength={7} onChange={handleInputChange} className="w-full min-w-0 rounded border border-zinc-400 px-2 py-1 text-center text-sm font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_cerca_oi_cil" value={formData.ref_cerca_oi_cil} maxLength={7} onChange={handleInputChange} className="w-full min-w-0 rounded border border-zinc-400 px-2 py-1 text-center text-sm font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900" />
                          <input type="text" name="ref_cerca_oi_eje" value={formData.ref_cerca_oi_eje} maxLength={3} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
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

                <div className="border-t border-zinc-200 pt-2 dark:border-zinc-700">
                  <section className="h-full rounded-xl border border-zinc-300 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-950">
                          OD
                          <input type="text" name="pio_od" value={formData.pio_od} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <span className="text-xs text-zinc-500">mmHg</span>
                        </label>
                        <label className="grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-950">
                          OI
                          <input type="text" name="pio_oi" value={formData.pio_oi} onChange={handleInputChange} className="w-full rounded border border-zinc-400 px-2 py-1 text-center dark:border-zinc-600 dark:bg-zinc-900" />
                          <span className="text-xs text-zinc-500">mmHg</span>
                        </label>
                      </div>

                      {[
                        { name: "biomicroscopia", label: "BMC", value: formData.biomicroscopia },
                        { name: "fondo_ojo", label: "FO", value: formData.fondo_ojo },
                        { name: "diagnostico", label: "DX", value: formData.diagnostico },
                        { name: "tratamiento", label: "TTO", value: formData.tratamiento },
                      ].map((field) => (
                        <label key={field.name} className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-2 text-sm font-bold">
                          <span className="pt-2">{field.label}</span>
                          <textarea
                            name={field.name}
                            value={field.value}
                            onChange={handleInputChange}
                            rows={1}
                            className="min-h-10 w-full resize-y rounded-lg border border-zinc-400 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-[#2d8f8f] focus:ring-2 focus:ring-[#2d8f8f]/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="mt-3 flex flex-wrap justify-end gap-3 border-t-2 border-zinc-300 pt-3 dark:border-zinc-700">
              <button 
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white font-bold rounded shadow-sm border border-zinc-400 text-center"
              >
                CANCELAR
              </button>
              <button 
                type="submit" 
                value="en_curso"
                disabled={isLoading || !formData.paciente_id || Boolean(savedConsultation)}
                className="px-8 py-2 bg-zinc-700 hover:bg-zinc-800 text-white font-bold rounded shadow-md border border-zinc-800 disabled:opacity-50 flex items-center gap-2 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                {isLoading ? 'GUARDANDO...' : savedConsultation ? 'AVANCE GUARDADO' : 'GUARDAR AVANCE'}
              </button>
              <button 
                type="submit" 
                value="finalizada"
                disabled={isLoading || !formData.paciente_id || Boolean(savedConsultation)}
                className="px-8 py-2 bg-[#2d8f8f] hover:bg-[#1f6b6b] text-white font-bold rounded shadow-md border border-[#1a5c5c] disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? 'GUARDANDO...' : savedConsultation ? 'CONSULTA FINALIZADA' : 'FINALIZAR CONSULTA'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
