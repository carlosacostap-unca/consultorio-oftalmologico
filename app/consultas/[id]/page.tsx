"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { formatDate } from "@/lib/utils";
import { ACTIVE_PATIENT_FILTER } from "@/lib/patient-merge";
import type { ConsultaEvento } from "@/lib/consulta-eventos";
import type { ConsultaEstado } from "@/lib/consulta-estado";
import { consultaEstadoBadgeClass, consultaEstadoLabel, normalizeConsultaEstado } from "@/lib/consulta-estado";
import { activeRoleJsonHeaders, resolveActiveRole } from "@/lib/active-role";
import type { UserRole } from "@/lib/permissions";
import type { Medico } from "@/lib/types";
import { canAssignAnyDoctor, doctorLabel } from "@/lib/doctor-attribution";
import { refractionHasValues } from "@/lib/refraction";
import { emptyIfOptionalClinicalZero, normalizeOptionalClinicalZeros } from "@/lib/clinical-empty-values";
import { clinicalDateKey, clinicalDateToStoredDateTime, isClinicalDateWithinLimit, todayClinicalDateKey } from "@/lib/clinical-date";
import { patientBirthAge } from "@/lib/patient-birth-date";
import { ClinicalDateInput } from "@/components/clinical-date-input";

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
  estado_registro?: string;
  fusionado_en_paciente_id?: string;
  expand?: {
    mutual_id?: {
      nombre: string;
    };
  };
}

interface ConsultaNavigationItem {
  id: string;
  fecha?: string;
  medico_id?: string;
  expand?: {
    medico_id?: Medico;
  };
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
  const pendingConsultaScrollYRef = useRef<number | null>(null);
  const pendingConsultaAnchorRef = useRef(false);
  const forceMedicalSectionFocusRef = useRef(false);
  const medicalFormRef = useRef<HTMLDivElement | null>(null);
  const consultaCacheRef = useRef<Map<string, any>>(new Map());
  const consultaEventosCacheRef = useRef<Map<string, ConsultaEvento[]>>(new Map());
  const consultasPacienteCacheRef = useRef<Map<string, ConsultaNavigationItem[]>>(new Map());
  const pacienteCacheRef = useRef<Map<string, Paciente>>(new Map());
  const recetasCacheRef = useRef<Map<string, any[]>>(new Map());
  const hasLoadedConfigRef = useRef(false);
  const hasLoadedMedicosRef = useRef(false);
  const hasLoadedPacientesRef = useRef(false);
  
  const isViewMode = searchParams.get("mode") === "view";
  const initialActiveConsultaId = searchParams.get("consulta_actual") || consultaId;
  
  console.log("Consulta ID recibido:", consultaId);
  
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [activeConsultaId, setActiveConsultaId] = useState(initialActiveConsultaId);
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
    medico_id: "",
    numero_ficha: "",
    estado: "finalizada" as ConsultaEstado,
    fecha: todayClinicalDateKey(),
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
  const [recetasAsociadas, setRecetasAsociadas] = useState<any[]>([]);
  const [primeraConsulta, setPrimeraConsulta] = useState<ConsultaNavigationItem | null>(null);
  const [consultaAnterior, setConsultaAnterior] = useState<ConsultaNavigationItem | null>(null);
  const [consultaPosterior, setConsultaPosterior] = useState<ConsultaNavigationItem | null>(null);
  const [ultimaConsulta, setUltimaConsulta] = useState<ConsultaNavigationItem | null>(null);
  const [consultaPosition, setConsultaPosition] = useState({ current: 0, total: 0 });
  const [isLoadingConsultaPosition, setIsLoadingConsultaPosition] = useState(false);
  const [consultaEditLimitDays, setConsultaEditLimitDays] = useState(7);
  const [consultaEventos, setConsultaEventos] = useState<ConsultaEvento[]>([]);
  const [isLoadingConsultaEventos, setIsLoadingConsultaEventos] = useState(true);
  const [consultaEventosError, setConsultaEventosError] = useState("");
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [originalMedicoId, setOriginalMedicoId] = useState("");
  const [expandedConsultaDoctor, setExpandedConsultaDoctor] = useState<Medico | null>(null);

  // Estado para la búsqueda de pacientes
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const getPacienteDocumento = (paciente: Paciente) => paciente.numero_documento || paciente.dni || "";
  const formatPacienteLabel = (paciente: Paciente) => {
    const documento = getPacienteDocumento(paciente);
    return `${paciente.apellido}, ${paciente.nombre}${documento ? ` - DNI: ${documento}` : ""}${paciente.numero_ficha ? ` - Ficha: ${paciente.numero_ficha}` : ""}`;
  };
  const getPacienteObraSocial = (paciente?: Paciente | null) => paciente?.expand?.mutual_id?.nombre || paciente?.obra_social || "";
  const canEditConsulta = isConsultaEditable(formData.fecha, consultaEditLimitDays);
  const isReadOnly = isViewMode || !canEditConsulta;
  const canChooseDoctor = canAssignAnyDoctor(activeRole);
  const assignableDoctors = canChooseDoctor ? medicos : medicos.filter((medico) => medico.id === user?.id);
  const selectedDoctor = medicos.find((medico) => medico.id === formData.medico_id) || expandedConsultaDoctor;
  const selectedDoctorLabel = selectedDoctor
    ? doctorLabel(selectedDoctor)
    : formData.medico_id
      ? "Medico asignado sin nombre visible"
      : "Sin medico asignado";
  const canEditDoctorAttribution =
    !isViewMode &&
    (canChooseDoctor || (activeRole === "medico" && (!formData.medico_id || formData.medico_id === user?.id)));
  const doctorAttributionChanged = formData.medico_id !== originalMedicoId;
  const showDoctorEditAction = isViewMode && activeRole === "medico" && canEditConsulta;
  const showSaveActions = !isReadOnly || (canEditDoctorAttribution && doctorAttributionChanged);
  const shouldAnchorConsultaNavigation = () => {
    const formTop = medicalFormRef.current
      ? medicalFormRef.current.getBoundingClientRect().top + window.scrollY
      : 0;

    return Boolean(medicalFormRef.current) && window.scrollY + 80 >= formTop;
  };
  const rememberConsultaScroll = () => {
    const shouldAnchor = shouldAnchorConsultaNavigation();
    pendingConsultaAnchorRef.current = shouldAnchor;
    pendingConsultaScrollYRef.current = window.scrollY;
    window.sessionStorage.setItem("consulta-detail-scroll-y", String(window.scrollY));
    window.sessionStorage.setItem("consulta-detail-anchor", shouldAnchor ? "1" : "0");
  };
  const getRememberedConsultaScroll = () => {
    const shouldAnchor = pendingConsultaAnchorRef.current || window.sessionStorage.getItem("consulta-detail-anchor") === "1";
    if (shouldAnchor && medicalFormRef.current) {
      return Math.max(0, medicalFormRef.current.getBoundingClientRect().top + window.scrollY - 12);
    }

    const savedScrollY = pendingConsultaScrollYRef.current ?? window.sessionStorage.getItem("consulta-detail-scroll-y");
    if (savedScrollY === null) return null;

    const top = Number(savedScrollY);
    return Number.isFinite(top) ? top : null;
  };
  const scheduleConsultaScrollRestore = () => {
    const top = getRememberedConsultaScroll();
    if (top === null) return;

    const restoreScroll = () => window.scrollTo({ top, left: 0, behavior: "auto" });
    window.requestAnimationFrame(restoreScroll);
    window.setTimeout(restoreScroll, 0);
    window.setTimeout(restoreScroll, 50);
    window.setTimeout(restoreScroll, 180);
    window.setTimeout(restoreScroll, 320);
  };
  const restoreConsultaScroll = () => {
    if (getRememberedConsultaScroll() === null) return;

    scheduleConsultaScrollRestore();
    pendingConsultaScrollYRef.current = null;
    pendingConsultaAnchorRef.current = false;
    window.sessionStorage.removeItem("consulta-detail-scroll-y");
    window.sessionStorage.removeItem("consulta-detail-anchor");
  };
  const focusMedicalSection = () => {
    const element = medicalFormRef.current;
    if (!element) return;

    const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY - 12);
    window.scrollTo({ top, left: 0, behavior: "auto" });
  };
  const scheduleMedicalSectionFocus = () => {
    if (!forceMedicalSectionFocusRef.current) return;

    focusMedicalSection();
    window.requestAnimationFrame(focusMedicalSection);
    window.setTimeout(focusMedicalSection, 0);
    window.setTimeout(focusMedicalSection, 60);
    window.setTimeout(focusMedicalSection, 180);
    window.setTimeout(focusMedicalSection, 360);
    window.setTimeout(() => {
      focusMedicalSection();
      forceMedicalSectionFocusRef.current = false;
    }, 700);
  };
  useLayoutEffect(() => {
    if (forceMedicalSectionFocusRef.current) {
      focusMedicalSection();
      window.requestAnimationFrame(focusMedicalSection);
      return;
    }

    const top = getRememberedConsultaScroll();
    if (top === null) return;

    const restoreScroll = () => window.scrollTo({ top, left: 0, behavior: "auto" });
    restoreScroll();
    window.requestAnimationFrame(restoreScroll);
  }, [activeConsultaId, consultaId]);
  const cacheConsulta = (consulta: any) => {
    if (consulta?.id) {
      consultaCacheRef.current.set(consulta.id, consulta);
    }
    return consulta;
  };
  const prefetchConsulta = (id?: string) => {
    if (!id || consultaCacheRef.current.has(id)) return;

    pb.collection("consultas")
      .getOne(id, { expand: "medico_id", requestKey: null })
      .then(cacheConsulta)
      .catch((error) => console.error("Error al precargar consulta:", error));
  };
  const prefetchConsultaSideData = (id?: string) => {
    if (!id) return;

    if (!recetasCacheRef.current.has(id)) {
      pb.collection("recetas")
        .getFullList({
          filter: `consulta_id = "${id}"`,
          sort: "-created",
          requestKey: null,
        })
        .then((records) => recetasCacheRef.current.set(id, records))
        .catch((error) => console.error("Error al precargar recetas:", error));
    }

    if (!consultaEventosCacheRef.current.has(id)) {
      pb.collection("consulta_eventos")
        .getFullList<ConsultaEvento>({
          filter: `consulta_id = "${id}"`,
          sort: "-created",
          requestKey: null,
        })
        .then((records) => consultaEventosCacheRef.current.set(id, records))
        .catch((error) => console.error("Error al precargar auditoria:", error));
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setActiveConsultaId(params.get("consulta_actual") || consultaId);
  }, [consultaId]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const queryConsultaId = params.get("consulta_actual");
      const match = window.location.pathname.match(/\/consultas\/([^/]+)/);
      const nextConsultaId = queryConsultaId || match?.[1];
      if (nextConsultaId) {
        rememberConsultaScroll();
        setIsLoadingConsultaPosition(true);
        setActiveConsultaId(nextConsultaId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const authUser = pb.authStore.record;
    setUser(authUser);
    setActiveRole(resolveActiveRole(authUser, ["medico"]));

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        if (!hasLoadedConfigRef.current) {
          hasLoadedConfigRef.current = true;
          fetch("/api/configuracion", {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          })
            .then((response) => (response.ok ? response.json() : null))
            .then((settings) => {
              if (settings?.consultaEditLimitDays !== undefined) {
                setConsultaEditLimitDays(settings.consultaEditLimitDays);
              }
            })
            .catch((error) => {
              hasLoadedConfigRef.current = false;
              console.error("Error al cargar configuracion:", error);
            });
        }

        if (!hasLoadedMedicosRef.current) {
          hasLoadedMedicosRef.current = true;
          const medicosResponse = await fetch("/api/medicos", {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          });
          if (medicosResponse.ok) {
            const medicosData = await medicosResponse.json();
            setMedicos(Array.isArray(medicosData.medicos) ? medicosData.medicos : []);
          } else {
            hasLoadedMedicosRef.current = false;
          }
        }

        // Cargar datos de la consulta existente PRIMERO para que la UI se actualice rápido
        let currentPacienteId = "";
        if (activeConsultaId) {
          const cachedConsulta = consultaCacheRef.current.get(activeConsultaId);
          const consultaRecord = cachedConsulta || cacheConsulta(
            await pb.collection("consultas").getOne(activeConsultaId, { expand: "medico_id", requestKey: null })
          );
          
          let fechaFormateada = todayClinicalDateKey();
          try {
            if (consultaRecord.fecha) {
              fechaFormateada = clinicalDateKey(consultaRecord.fecha);
            }
          } catch (e) {
            console.error("Error al formatear fecha:", e);
          }

          const normalizedConsulta = normalizeOptionalClinicalZeros(consultaRecord);
          setFormData(prev => ({
            ...prev,
            ...normalizedConsulta,
            ant_gota: false,
            estado: normalizeConsultaEstado(String(normalizedConsulta.estado || "")),
            fecha: fechaFormateada,
            paciente_id: normalizedConsulta.paciente_id || prev.paciente_id
          }));
          setOriginalMedicoId(normalizedConsulta.medico_id || "");
          setExpandedConsultaDoctor(consultaRecord.expand?.medico_id || null);
          
          currentPacienteId = normalizedConsulta.paciente_id;

          try {
            setIsLoadingConsultaEventos(true);
            setConsultaEventosError("");
            const cachedEventos = consultaEventosCacheRef.current.get(activeConsultaId);
            const eventosRecords = cachedEventos || await pb.collection("consulta_eventos").getFullList<ConsultaEvento>({
                filter: `consulta_id = "${activeConsultaId}"`,
                sort: "-created",
                requestKey: null,
              });
            if (!cachedEventos) {
              consultaEventosCacheRef.current.set(activeConsultaId, eventosRecords);
            }
            setConsultaEventos(eventosRecords);
          } catch (e) {
            console.error("Error al cargar auditoria de consulta:", e);
            setConsultaEventos([]);
            setConsultaEventosError("No se pudo cargar la auditoria de esta consulta.");
          } finally {
            setIsLoadingConsultaEventos(false);
          }

          if (currentPacienteId) {
            const cachedConsultasPaciente = consultasPacienteCacheRef.current.get(currentPacienteId);
            const consultasPaciente = cachedConsultasPaciente || await pb.collection("consultas").getFullList<ConsultaNavigationItem>({
                filter: `paciente_id = "${currentPacienteId}"`,
                sort: "fecha,created",
                expand: "medico_id",
                requestKey: null,
              });
            if (!cachedConsultasPaciente) {
              consultasPacienteCacheRef.current.set(currentPacienteId, consultasPaciente);
              consultasPaciente.forEach((consulta) => {
                if (!consultaCacheRef.current.has(consulta.id)) {
                  cacheConsulta(consulta);
                }
              });
            }
            const currentIndex = consultasPaciente.findIndex((consulta) => consulta.id === activeConsultaId);
            setPrimeraConsulta(consultasPaciente.length > 0 ? consultasPaciente[0] : null);
            setUltimaConsulta(consultasPaciente.length > 0 ? consultasPaciente[consultasPaciente.length - 1] : null);
            setConsultaAnterior(currentIndex > 0 ? consultasPaciente[currentIndex - 1] : null);
            setConsultaPosterior(
              currentIndex >= 0 && currentIndex < consultasPaciente.length - 1
                ? consultasPaciente[currentIndex + 1]
                : null
            );
            setConsultaPosition({
              current: currentIndex >= 0 ? currentIndex + 1 : 0,
              total: consultasPaciente.length,
            });
            prefetchConsulta(consultasPaciente[currentIndex - 1]?.id);
            prefetchConsulta(consultasPaciente[currentIndex + 1]?.id);
            prefetchConsultaSideData(consultasPaciente[currentIndex - 1]?.id);
            prefetchConsultaSideData(consultasPaciente[currentIndex + 1]?.id);
            setIsLoadingConsultaPosition(false);
          } else {
            setPrimeraConsulta(null);
            setConsultaAnterior(null);
            setConsultaPosterior(null);
            setUltimaConsulta(null);
            setConsultaPosition({ current: 0, total: 0 });
            setIsLoadingConsultaPosition(false);
          }

          // Cargar recetas asociadas
          try {
            const cachedRecetas = recetasCacheRef.current.get(activeConsultaId);
            const recetasRecords = cachedRecetas || await pb.collection("recetas").getFullList({
                filter: `consulta_id = "${activeConsultaId}"`,
                sort: "-created",
                requestKey: null,
              });
            if (!cachedRecetas) {
              recetasCacheRef.current.set(activeConsultaId, recetasRecords);
            }
            setRecetasAsociadas(recetasRecords);
          } catch (e) {
            console.log("Error al cargar recetas o no existen aún");
          }
          
          // Cargar el paciente específico de esta consulta rápido
          if (currentPacienteId) {
             try {
               const cachedPaciente = pacienteCacheRef.current.get(currentPacienteId);
               const p = cachedPaciente || await pb.collection("pacientes").getOne<Paciente>(currentPacienteId, {
                   expand: "mutual_id",
                   requestKey: null,
                 });
               if (!cachedPaciente) {
                 pacienteCacheRef.current.set(currentPacienteId, p);
               }
               setSelectedPacienteData(p);
               if (!hasLoadedPacientesRef.current) {
                 setPacientes([p]); // Temporalmente ponemos solo este paciente para que el select no se rompa
               }
             } catch(e) {
               console.error("Error cargando paciente de la consulta", e);
             }
          }
          restoreConsultaScroll();
          scheduleMedicalSectionFocus();
        }

        if (!hasLoadedPacientesRef.current) {
          hasLoadedPacientesRef.current = true;
          // Luego cargar todos los pacientes para el select (puede tardar por ser 70k+)
          // NOTA: Para producción con 70k registros esto debería ser un autocompletado con búsqueda en API.
          const pacientesRecords = await pb.collection("pacientes").getFullList<Paciente>({
            sort: "apellido,nombre",
            filter: ACTIVE_PATIENT_FILTER,
            expand: "mutual_id",
            requestKey: null,
          });
          pacientesRecords.forEach((paciente) => pacienteCacheRef.current.set(paciente.id, paciente));
          setPacientes(pacientesRecords);
        }
        restoreConsultaScroll();
        scheduleMedicalSectionFocus();

      } catch (error) {
        console.error("Error al cargar datos:", error);
        hasLoadedPacientesRef.current = false;
        setIsLoadingConsultaPosition(false);
        restoreConsultaScroll();
        scheduleMedicalSectionFocus();
        alert("Error al cargar los datos de la consulta. Verifica la consola.");
      }
    };

    loadData();
  }, [router, activeConsultaId]);

  // Actualizar cabecera de paciente cuando se selecciona uno
  useEffect(() => {
    if (formData.paciente_id) {
      const p = pacientes.find(p => p.id === formData.paciente_id) || null;
      setSelectedPacienteData(p);
      if (p) {
        setPatientSearchQuery(formatPacienteLabel(p));
        
        // Auto-completar número de ficha de la consulta con el del paciente (si está vacío)
        if (!formData.numero_ficha && p.numero_ficha) {
          setFormData(prev => ({ ...prev, numero_ficha: p.numero_ficha || "" }));
        }
      }
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
        const addNum = parseFloat(value.replace(',', '.')) || 0;
        const esfOdNum = parseFloat(prev.ref_lejos_od_esf.replace(',', '.')) || 0;
        const esfOiNum = parseFloat(prev.ref_lejos_oi_esf.replace(',', '.')) || 0;
        
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

  const handleDateChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const onlyDoctorAttributionChange = doctorAttributionChanged && !canEditConsulta;
    if (!canEditConsulta && !onlyDoctorAttributionChange) {
      alert(`Solo se pueden editar consultas de los ultimos ${consultaEditLimitDays} dias.`);
      return;
    }
    if (onlyDoctorAttributionChange && !formData.medico_id) {
      alert("Selecciona el medico responsable.");
      return;
    }

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const targetEstado: ConsultaEstado = submitter?.value === "finalizada" ? "finalizada" : normalizeConsultaEstado(formData.estado);
    setIsLoading(true);
    try {
      // Aseguramos formato ISO para la fecha
      const dataToSave = onlyDoctorAttributionChange
        ? { medico_id: formData.medico_id }
        : {
            ...normalizeOptionalClinicalZeros(formData),
            estado: targetEstado,
            fecha: clinicalDateToStoredDateTime(formData.fecha),
            ant_gota: false,
          };
      
      const response = await fetch(`/api/consultas/${activeConsultaId}`, {
        method: "PATCH",
        headers: activeRoleJsonHeaders(pb.authStore.token, activeRole),
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "No se pudo actualizar la consulta");
      }
      setOriginalMedicoId(formData.medico_id);
      
      // Si venimos desde un turno, lo actualizamos para enlazarlo y marcarlo completado
      if (turnoId) {
        try {
          await pb.collection("turnos").update(turnoId, {
            consulta_id: activeConsultaId,
            estado: targetEstado === "finalizada" ? "Atendido" : "En consulta"
          });
        } catch (turnoError: any) {
          console.error("Error al actualizar el turno:", turnoError);
          alert(`La consulta se guardó, pero hubo un error al enlazarla con el turno. Detalle: ${turnoError?.message || 'Error desconocido'}. Verifica que el campo 'consulta_id' exista y sea de tipo relación simple.`);
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
    return patientBirthAge(fechaNacimiento) ?? "-";
  };

  const displayValue = (value?: string | number | null) => {
    const normalized = String(value ?? "").trim();
    return normalized || "-";
  };

  const displayOptionalClinicalValue = (field: string, value?: string | number | null) => {
    const normalized = String(emptyIfOptionalClinicalZero(field, value) ?? "").trim();
    return normalized || "-";
  };

  const consultaDateLabel = formData.fecha
    ? formatDate(formData.fecha)
    : "-";
  const formatAuditDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${formatDate(value)} ${date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };
  const consultaEventoTipoLabel = (tipo: ConsultaEvento["tipo"]) => {
    switch (tipo) {
      case "created":
        return "Creacion";
      case "status_changed":
        return "Estado";
      default:
        return "Edicion";
    }
  };

  const pacienteNombre = selectedPacienteData
    ? `${selectedPacienteData.apellido}, ${selectedPacienteData.nombre}`
    : "Paciente seleccionado";

  const patientSummaryItems = selectedPacienteData
    ? [
        selectedPacienteData.numero_ficha ? `Ficha ${selectedPacienteData.numero_ficha}` : "",
        getPacienteDocumento(selectedPacienteData) ? `DNI ${getPacienteDocumento(selectedPacienteData)}` : "",
        selectedPacienteData.fecha_nacimiento ? `${calcularEdad(selectedPacienteData.fecha_nacimiento)} anos` : "",
        getPacienteObraSocial(selectedPacienteData),
        selectedPacienteData.ocupacion ? `Ocupacion ${selectedPacienteData.ocupacion}` : "",
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
  const fixedAntecedenteChips = [
    { key: "ant_diabetes", label: "DIABETES" },
    { key: "ant_glaucoma", label: "GLAUCOMA" },
    { key: "ant_maculopatia", label: "MACULOPATIA" },
    { key: "ant_asmatico", label: "ASMA" },
    { key: "ant_hipertension", label: "HIPERTENSION" },
    { key: "ant_alergico", label: "ALERGIA" },
    { key: "ant_reuma", label: "REUMA" },
    { key: "ant_herpes", label: "HERPES" },
  ] as const;
  const currentConsultaEstado = normalizeConsultaEstado(formData.estado);
  const isConsultaFinalizada = currentConsultaEstado === "finalizada" || currentConsultaEstado === "anulada";

  const hasDiagnosis = Boolean(formData.diagnostico?.trim());
  const hasTreatment = Boolean(formData.tratamiento?.trim());
  const hasOpticalPrescription = refractionHasValues(formData);
  const continuityCards = [
    {
      title: "Estado",
      value: consultaEstadoLabel(currentConsultaEstado),
      detail: currentConsultaEstado === "finalizada" ? "Consulta cerrada clinicamente." : "Consulta pendiente de cierre clinico.",
      tone: currentConsultaEstado === "finalizada" ? "emerald" : currentConsultaEstado === "anulada" ? "amber" : "blue",
    },
    {
      title: "Diagnostico",
      value: hasDiagnosis ? "Registrado" : "Pendiente",
      detail: hasDiagnosis ? formData.diagnostico : "Sin diagnostico cargado.",
      tone: hasDiagnosis ? "emerald" : "amber",
    },
    {
      title: "Tratamiento",
      value: hasTreatment ? "Registrado" : "Pendiente",
      detail: hasTreatment ? formData.tratamiento : "Sin tratamiento cargado.",
      tone: hasTreatment ? "emerald" : "amber",
    },
    {
      title: "Recetas",
      value: `${recetasAsociadas.length}`,
      detail: recetasAsociadas.length === 1 ? "1 receta emitida en esta consulta." : `${recetasAsociadas.length} recetas emitidas en esta consulta.`,
      tone: recetasAsociadas.length > 0 ? "emerald" : "zinc",
    },
    {
      title: "Anteojos",
      value: hasOpticalPrescription ? "Con datos" : "Sin datos",
      detail: hasOpticalPrescription ? "Hay refraccion cargada para imprimir." : "No hay refraccion cargada.",
      tone: hasOpticalPrescription ? "emerald" : "zinc",
    },
  ];

  const refractionRows = [
    {
      label: "Lejos OD",
      key: "lejos_od",
      esf: formData.ref_lejos_od_esf,
      cil: formData.ref_lejos_od_cil,
      eje: formData.ref_lejos_od_eje,
    },
    {
      label: "Lejos OI",
      key: "lejos_oi",
      esf: formData.ref_lejos_oi_esf,
      cil: formData.ref_lejos_oi_cil,
      eje: formData.ref_lejos_oi_eje,
    },
    {
      label: "Cerca OD",
      key: "cerca_od",
      esf: formData.ref_cerca_od_esf,
      cil: formData.ref_cerca_od_cil,
      eje: formData.ref_cerca_od_eje,
    },
    {
      label: "Cerca OI",
      key: "cerca_oi",
      esf: formData.ref_cerca_oi_esf,
      cil: formData.ref_cerca_oi_cil,
      eje: formData.ref_cerca_oi_eje,
    },
  ];

  const goToConsulta = (id: string, options?: { focusMedicalSection?: boolean }) => {
    if (id === activeConsultaId) return;

    forceMedicalSectionFocusRef.current = Boolean(options?.focusMedicalSection);
    rememberConsultaScroll();
    setIsLoadingConsultaPosition(true);
    scheduleConsultaScrollRestore();
    scheduleMedicalSectionFocus();
    setActiveConsultaId(id);
    window.setTimeout(scheduleConsultaScrollRestore, 0);
    window.setTimeout(scheduleMedicalSectionFocus, 0);
  };

  const goToPatientDetail = () => {
    const pacienteId = selectedPacienteData?.id || formData.paciente_id;
    if (pacienteId) {
      router.push(`/pacientes/${pacienteId}?mode=view`);
      return;
    }

    router.back();
  };

  function isConsultaEditable(fecha: string | undefined, limitDays: number) {
    return isClinicalDateWithinLimit(fecha, limitDays);
  }

function continuityToneClass(tone: string) {
  switch (tone) {
    case "emerald":
      return "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20";
    case "amber":
      return "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20";
    case "blue":
      return "border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20";
    default:
      return "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60";
  }
}

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-[1500px] mx-auto">
        {!isViewMode && !canEditConsulta && (
          <div className="mb-6 rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Esta consulta ya no se puede editar porque excede el plazo configurado de {consultaEditLimitDays} dias.
          </div>
        )}

        <div className="flex flex-col">
        <section id="clinical-context-panel" aria-label="Continuidad clinica" className="order-2 mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Continuidad clinica</p>
              <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">Estado de la atencion</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Resumen para continuar el flujo clinico sin perder el contexto de la consulta.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
              {showDoctorEditAction && (
                <Link href={`/consultas/${activeConsultaId}`} className="rounded-lg bg-[#2d8f8f] px-3 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-[#1f6b6b]">
                  Editar consulta
                </Link>
              )}
              <Link href={formData.paciente_id ? `/pacientes/${formData.paciente_id}?mode=view` : "#"} className={`rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-semibold transition-colors dark:border-zinc-700 ${formData.paciente_id ? "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800" : "pointer-events-none bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                Ficha clinica
              </Link>
              <Link href={`/recetas/nueva?consulta_id=${activeConsultaId}&paciente_id=${formData.paciente_id}`} className={`rounded-lg bg-orange-600 px-3 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-orange-700 ${formData.paciente_id ? "" : "pointer-events-none opacity-50"}`}>
                Crear receta
              </Link>
              <Link href={`/consultas/${activeConsultaId}/imprimir`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                Imprimir informe
              </Link>
              <Link href={`/consultas/${activeConsultaId}/imprimir-anteojos`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                Imprimir anteojos
              </Link>
              <Link href={formData.paciente_id ? `/consultas/nueva?paciente_id=${formData.paciente_id}` : "#"} className={`rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-semibold transition-colors dark:border-zinc-700 ${formData.paciente_id ? "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800" : "pointer-events-none bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                Nueva consulta
              </Link>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {continuityCards.map((card) => (
              <div key={card.title} className={`rounded-xl border p-4 ${continuityToneClass(card.tone)}`}>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{card.title}</div>
                <div className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">{card.value}</div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Paciente</h3>
              <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{pacienteNombre}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                {patientSummaryItems.length > 0 ? patientSummaryItems.map((item) => (
                  <span key={item} className="rounded-full bg-white px-2.5 py-1 font-medium dark:bg-zinc-900">{item}</span>
                )) : (
                  <span>Datos del paciente en carga</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Antecedentes activos</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeAntecedentes.length > 0 ? activeAntecedentes.map((item) => (
                  <span key={item} className="rounded-full border border-amber-500 bg-amber-800 px-2.5 py-1 text-xs font-semibold text-yellow-100 shadow-sm dark:border-amber-400 dark:bg-amber-800/80 dark:text-yellow-100">{item}</span>
                )) : (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Sin antecedentes activos</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Proximo paso</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {recetasAsociadas.length > 0 ? "Revisar recetas emitidas o imprimir indicaciones." : hasTreatment ? "Emitir receta si el tratamiento lo requiere." : "Completar diagnostico y tratamiento para cerrar la consulta."}
              </p>
            </div>
          </div>
        </section>

        {/* Contenedor del Formulario (Diseño estilo Legacy) */}
        <section className="order-3 mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2d8f8f] dark:text-emerald-400">Detalle clinico</p>
                <h2 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{pacienteNombre}</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold dark:bg-zinc-800">Consulta {consultaDateLabel}</span>
                  <span className={`rounded-full border px-2.5 py-1 font-semibold ${consultaEstadoBadgeClass(currentConsultaEstado)}`}>
                    {consultaEstadoLabel(currentConsultaEstado)}
                  </span>
                  {patientSummaryItems.length > 0 ? patientSummaryItems.map((item) => (
                    <span key={item} className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium dark:bg-zinc-800">{item}</span>
                  )) : (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium dark:bg-zinc-800">Datos del paciente en carga</span>
                  )}
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {isReadOnly ? "Solo lectura" : "Editable"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                {showDoctorEditAction && (
                  <Link href={`/consultas/${activeConsultaId}`} className="rounded-lg bg-[#2d8f8f] px-3 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-[#1f6b6b]">
                    Editar consulta
                  </Link>
                )}
                <Link href={formData.paciente_id ? `/pacientes/${formData.paciente_id}?mode=view` : "#"} className={`rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-semibold transition-colors dark:border-zinc-700 ${formData.paciente_id ? "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800" : "pointer-events-none bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                  Ver paciente
                </Link>
                <Link href={`/recetas/nueva?consulta_id=${activeConsultaId}&paciente_id=${formData.paciente_id}`} className={`rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-semibold transition-colors dark:border-zinc-700 ${formData.paciente_id ? "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800" : "pointer-events-none bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                  Crear receta
                </Link>
                <Link href={`/consultas/${activeConsultaId}/imprimir`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                  Imprimir informe
                </Link>
                <Link href={`/consultas/${activeConsultaId}/imprimir-anteojos`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                  Imprimir anteojos
                </Link>
                <Link href={formData.paciente_id ? `/consultas/nueva?paciente_id=${formData.paciente_id}` : "#"} className={`rounded-lg px-3 py-2 text-center text-sm font-bold transition-colors ${formData.paciente_id ? "bg-[#2d8f8f] text-white hover:bg-[#1f6b6b]" : "pointer-events-none bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                  Nueva consulta
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800 lg:border-b-0 lg:border-r">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Resumen clinico</h3>
              <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                  <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Motivo</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayValue(formData.motivo_consulta)}</dd>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                  <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Diagnostico</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayValue(formData.diagnostico)}</dd>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                  <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Tratamiento</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayValue(formData.tratamiento)}</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <h4 className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Agudeza visual</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <span>SC OD: <strong>{displayOptionalClinicalValue("av_sc_od", formData.av_sc_od)}</strong></span>
                    <span>SC OI: <strong>{displayOptionalClinicalValue("av_sc_oi", formData.av_sc_oi)}</strong></span>
                    <span>CC OD: <strong>{displayOptionalClinicalValue("av_cc_od", formData.av_cc_od)}</strong></span>
                    <span>CC OI: <strong>{displayOptionalClinicalValue("av_cc_oi", formData.av_cc_oi)}</strong></span>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <h4 className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Presion ocular</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <span>OD: <strong>{displayOptionalClinicalValue("pio_od", formData.pio_od)}</strong></span>
                    <span>OI: <strong>{displayOptionalClinicalValue("pio_oi", formData.pio_oi)}</strong></span>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <h4 className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Antecedentes activos</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeAntecedentes.length > 0 ? activeAntecedentes.map((item) => (
                      <span key={item} className="rounded-full border border-amber-500 bg-amber-800 px-2 py-1 text-xs font-semibold text-yellow-100 shadow-sm dark:border-amber-400 dark:bg-amber-800/80 dark:text-yellow-100">{item}</span>
                    )) : (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Sin antecedentes activos</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Refraccion</h3>
                {formData.add_value && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">ADD {formData.add_value}</span>
                )}
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/70 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2">Ojo</th>
                      <th className="px-3 py-2">ESF</th>
                      <th className="px-3 py-2">CIL</th>
                      <th className="px-3 py-2">EJE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {refractionRows.map((row) => (
                      <tr key={row.label}>
                        <td className="px-3 py-2 font-semibold text-zinc-900 dark:text-zinc-100">{row.label}</td>
                        <td className="px-3 py-2">{displayOptionalClinicalValue(`ref_${row.key}_esf`, row.esf)}</td>
                        <td className="px-3 py-2">{displayOptionalClinicalValue(`ref_${row.key}_cil`, row.cil)}</td>
                        <td className="px-3 py-2">{displayOptionalClinicalValue(`ref_${row.key}_eje`, row.eje)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950/60">
                  <span className="font-semibold">Biomicroscopia: </span>{displayValue(formData.biomicroscopia)}
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950/60">
                  <span className="font-semibold">Fondo de ojo: </span>{displayValue(formData.fondo_ojo)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Auditoria de consulta" className="order-4 mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Auditoria</p>
              <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">Historial de la consulta</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Registro operativo de creacion y cambios sobre esta consulta.</p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {consultaEventos.length} eventos
            </span>
          </div>

          {isLoadingConsultaEventos ? (
            <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Cargando auditoria...</div>
          ) : consultaEventosError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
              {consultaEventosError}
            </div>
          ) : consultaEventos.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
              Todavia no hay historial de auditoria para esta consulta.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {consultaEventos.map((evento) => (
                <div key={evento.id} className="grid grid-cols-1 gap-3 border-l-2 border-blue-300 bg-zinc-50 p-4 dark:border-blue-800 dark:bg-zinc-950 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <div>
                    <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{formatAuditDate(evento.created)}</div>
                    <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {consultaEventoTipoLabel(evento.tipo)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{evento.titulo}</div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{evento.detalle || "-"}</p>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Actor: {evento.actor_nombre || "Usuario no identificado"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div ref={medicalFormRef} className="order-1 mb-6 bg-[#f0f0f0] dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
          
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 text-sm text-zinc-900 dark:text-zinc-100 font-sans">
            
            {/* Sección: DATOS DEL PACIENTE */}
            <div className="mb-3">
              <div className="grid grid-cols-1 items-end gap-2 rounded border border-zinc-300 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 md:grid-cols-[minmax(22rem,2.6fr)_3.5rem_minmax(11rem,0.9fr)_5.75rem_minmax(15rem,1.35fr)_7.5rem]">
                <div className="col-span-full md:col-span-1 relative">
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
                    disabled={isReadOnly}
                    placeholder="Buscar por Apellido, Nombre o DNI"
                    className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:border-[#2d8f8f]"
                  />
                  {showPatientDropdown && !isReadOnly && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-lg max-h-60 overflow-y-auto">
                      {pacientes
                        .filter(p => 
                          p.apellido.toLowerCase().includes(patientSearchQuery.toLowerCase()) || 
                          p.nombre.toLowerCase().includes(patientSearchQuery.toLowerCase()) || 
                          getPacienteDocumento(p).includes(patientSearchQuery) ||
                          (p.numero_ficha && p.numero_ficha.toLowerCase().includes(patientSearchQuery.toLowerCase()))
                        )
                        .slice(0, 50)
                        .map(p => (
                          <div
                            key={p.id}
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, paciente_id: p.id }));
                              setPatientSearchQuery(formatPacienteLabel(p));
                              setShowPatientDropdown(false);
                            }}
                          >
                            <div className="font-bold">{p.apellido}, {p.nombre}</div>
                            <div className="text-xs text-zinc-500">DNI: {getPacienteDocumento(p) || "-"} {p.numero_ficha ? `| Ficha: ${p.numero_ficha}` : ''}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="col-span-full md:col-span-1">
                  <label className="block text-xs font-semibold mb-1">Edad</label>
                  <div className="[&>span]:hidden">
                    <input type="text" readOnly value={selectedPacienteData ? calcularEdad(selectedPacienteData.fecha_nacimiento) : ""} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-center" />
                    <span className="text-xs">Años</span>
                  </div>
                </div>
                <div className="hidden">
                  <label className="block text-xs font-semibold mb-1">Nº Ficha</label>
                  <input 
                    type="text" 
                    name="numero_ficha"
                    readOnly={isReadOnly}
                    value={formData.numero_ficha || ""} 
                    onChange={handleInputChange}
                    className={`w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 font-semibold focus:ring-2 focus:ring-blue-500 outline-none ${isReadOnly ? 'bg-zinc-200 dark:bg-zinc-700' : 'bg-white dark:bg-zinc-800'}`}
                  />
                </div>
                <div className="col-span-full md:col-span-1">
                  <label className="block text-xs font-semibold mb-1">Obra Social</label>
                  <input type="text" readOnly value={getPacienteObraSocial(selectedPacienteData)} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="col-span-full md:col-span-1">
                  <label className="block text-xs font-semibold mb-1">Nro. Afiliado</label>
                  <input type="text" readOnly value={selectedPacienteData?.numero_afiliado || ""} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="col-span-full md:col-span-1">
                  <label className="block text-xs font-semibold mb-1">Domicilio</label>
                  <input type="text" readOnly value={selectedPacienteData?.domicilio || ""} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="col-span-full md:col-span-1">
                  <label className="block text-xs font-semibold mb-1">Ocupacion</label>
                  <input type="text" aria-label="Ocupacion" readOnly value={selectedPacienteData?.ocupacion || ""} className="w-full px-2 py-1 border border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="col-span-full flex flex-wrap items-center gap-2 rounded-xl border-2 border-zinc-300 bg-zinc-50 p-2.5 shadow-inner dark:border-zinc-600 dark:bg-zinc-800">
                  {fixedAntecedenteChips.map((antecedente) => {
                    const isActive = Boolean(formData[antecedente.key]);

                    return (
                      <button
                        key={antecedente.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          if (isReadOnly) return;
                          setFormData((prev) => ({ ...prev, [antecedente.key]: !prev[antecedente.key] }));
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                          isActive
                            ? "border-amber-500 bg-amber-800 text-yellow-100 shadow-sm dark:border-amber-400 dark:bg-amber-800/80 dark:text-yellow-100"
                            : "border-zinc-400 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                        } ${isReadOnly ? "cursor-default" : "hover:border-[#2d8f8f] hover:text-[#2d8f8f] dark:hover:border-emerald-500 dark:hover:text-emerald-400"}`}
                      >
                        {antecedente.label}
                      </button>
                    );
                  })}
                  <div className="flex flex-grow items-center gap-2">
                    <span className={`font-semibold text-sm whitespace-nowrap ${formData.ant_otra.trim() ? "text-amber-700 dark:text-yellow-100" : ""}`}>OTRA:</span>
                    <input type="text" name="ant_otra" value={formData.ant_otra} onChange={handleInputChange} disabled={isReadOnly} className={`flex-grow px-2 py-1 border bg-white dark:bg-zinc-900 focus:outline-none ${formData.ant_otra.trim() ? "border-amber-500 text-amber-900 dark:border-amber-400 dark:text-yellow-100" : "border-zinc-400 dark:border-zinc-600 focus:border-[#2d8f8f]"}`} />
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
              <div className="p-3 border-2 border-zinc-300 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex flex-wrap items-center gap-2 shadow-inner">
                {fixedAntecedenteChips.map((antecedente) => {
                  const isActive = Boolean(formData[antecedente.key]);

                  return (
                    <button
                      key={antecedente.key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        if (isReadOnly) return;
                        setFormData((prev) => ({ ...prev, [antecedente.key]: !prev[antecedente.key] }));
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                        isActive
                          ? "border-amber-500 bg-amber-800 text-yellow-100 shadow-sm dark:border-amber-400 dark:bg-amber-800/80 dark:text-yellow-100"
                          : "border-zinc-400 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                      } ${isReadOnly ? "cursor-default" : "hover:border-[#2d8f8f] hover:text-[#2d8f8f] dark:hover:border-emerald-500 dark:hover:text-emerald-400"}`}
                    >
                      {antecedente.label}
                    </button>
                  );
                })}
                <div className="flex items-center gap-2 flex-grow">
                  <span className="font-semibold text-sm whitespace-nowrap">OTRA:</span>
                  <input type="text" name="ant_otra" value={formData.ant_otra} onChange={handleInputChange} disabled={isReadOnly} className={`flex-grow px-2 py-1 border bg-white dark:bg-zinc-900 focus:outline-none ${formData.ant_otra.trim() ? "border-amber-500 text-amber-900 dark:border-amber-400 dark:text-yellow-100" : "border-zinc-400 dark:border-zinc-600 focus:border-[#2d8f8f]"}`} />
                </div>
              </div>
            </div>

            {/* Sección: DATOS MEDICOS */}
            <div className="mb-3">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <h3 className="mr-2 whitespace-nowrap text-[#1f6b6b] font-bold uppercase dark:text-emerald-500">
                    Examen y cierre clinico
                    {isLoadingConsultaPosition ? (
                      <span className="ml-2 normal-case text-xs font-semibold opacity-80">(Cargando posicion...)</span>
                    ) : consultaPosition.total > 0 && (
                      <span className="ml-2 normal-case text-xs font-semibold">(CONSULTA {consultaPosition.current} de {consultaPosition.total})</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => primeraConsulta && goToConsulta(primeraConsulta.id, { focusMedicalSection: true })}
                      disabled={!primeraConsulta || primeraConsulta.id === activeConsultaId}
                      aria-label="Primera consulta"
                      title="Primera consulta"
                      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white px-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      &lt;&lt;
                    </button>
                    <button
                      type="button"
                      onClick={() => consultaAnterior && goToConsulta(consultaAnterior.id, { focusMedicalSection: true })}
                      disabled={!consultaAnterior}
                      aria-label="Consulta anterior"
                      title="Consulta anterior"
                      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white px-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      &lt;
                    </button>
                    <button
                      type="button"
                      onClick={() => consultaPosterior && goToConsulta(consultaPosterior.id, { focusMedicalSection: true })}
                      disabled={!consultaPosterior}
                      aria-label="Consulta posterior"
                      title="Consulta posterior"
                      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white px-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      &gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => ultimaConsulta && goToConsulta(ultimaConsulta.id, { focusMedicalSection: true })}
                      disabled={!ultimaConsulta || ultimaConsulta.id === activeConsultaId}
                      aria-label="Ultima consulta"
                      title="Ultima consulta"
                      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white px-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      &gt;&gt;
                    </button>
                    <Link
                      href={`/consultas/nueva?paciente_id=${formData.paciente_id}`}
                      aria-label="Nueva consulta"
                      title="Nueva consulta"
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-base font-bold transition-colors ${
                        formData.paciente_id
                          ? "bg-[#2d8f8f] text-white hover:bg-[#1f6b6b]"
                          : "pointer-events-none bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                      }`}
                    >
                      +
                    </Link>
                  </div>
                  <div className="h-px flex-grow bg-[#1f6b6b] dark:bg-emerald-500"></div>
                  <div className="whitespace-nowrap text-xs font-semibold text-[#1f6b6b] dark:text-emerald-500">
                    Medico responsable: <span className="font-bold">{selectedDoctorLabel}</span>
                  </div>
                </div>

                <div className="space-y-3 rounded border border-zinc-300 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <section className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-zinc-300 bg-zinc-100 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/30 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                  <label className="flex max-w-[220px] items-center gap-3">
                    <span className="text-sm font-bold">Fecha</span>
                    <ClinicalDateInput
                      required
                      name="fecha"
                      value={formData.fecha}
                      onChangeDate={handleDateChange}
                      disabled={isReadOnly}
                      className="w-[168px] rounded-md border border-zinc-400 bg-white px-3 py-2 text-center font-bold focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900 dark:[color-scheme:dark]"
                    />
                  </label>

                  <label className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                    <span className="text-lg font-bold">Motivo</span>
                    <textarea
                      name="motivo_consulta"
                      value={formData.motivo_consulta}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      placeholder="Motivo principal de la atencion..."
                      rows={1}
                      className="min-h-10 flex-1 resize-y rounded-md border border-zinc-400 bg-white px-3 py-2 font-semibold focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-950"
                    />
                  </label>
                </section>

                <section className="grid min-w-0 grid-cols-1 gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-700 xl:grid-cols-[minmax(280px,0.68fr)_minmax(0,1.32fr)]">
                  <div className="h-full min-w-0 rounded-lg border border-zinc-300 bg-zinc-100 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/30">
                  <h4 className="mb-2 text-center text-base font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Agudeza visual</h4>
                  <div className="grid gap-2 lg:grid-cols-2">
                    <div className="rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                      <div className="mb-3 text-xs font-bold text-blue-900 dark:text-blue-200">OD</div>
                      <label className="mb-2 grid grid-cols-[78px_minmax(0,1fr)] items-center gap-3">
                        <span className="text-sm font-bold">AV S/C</span>
                        <input type="text" name="av_sc_od" value={formData.av_sc_od} onChange={handleInputChange} disabled={isReadOnly} className="h-8 rounded border border-zinc-400 bg-white px-2 text-center font-bold focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      </label>
                      <label className="grid grid-cols-[78px_minmax(0,1fr)] items-center gap-3">
                        <span className="text-sm font-bold">AV C/C</span>
                        <input type="text" name="av_cc_od" value={formData.av_cc_od} onChange={handleInputChange} disabled={isReadOnly} className="h-8 rounded border border-zinc-400 bg-white px-2 text-center font-bold focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      </label>
                    </div>

                    <div className="rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                      <div className="mb-3 text-xs font-bold text-blue-900 dark:text-blue-200">OI</div>
                      <label className="mb-2 grid grid-cols-[78px_minmax(0,1fr)] items-center gap-3">
                        <span className="text-sm font-bold">AV S/C</span>
                        <input type="text" name="av_sc_oi" value={formData.av_sc_oi} onChange={handleInputChange} disabled={isReadOnly} className="h-8 rounded border border-zinc-400 bg-white px-2 text-center font-bold focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      </label>
                      <label className="grid grid-cols-[78px_minmax(0,1fr)] items-center gap-3">
                        <span className="text-sm font-bold">AV C/C</span>
                        <input type="text" name="av_cc_oi" value={formData.av_cc_oi} onChange={handleInputChange} disabled={isReadOnly} className="h-8 rounded border border-zinc-400 bg-white px-2 text-center font-bold focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      </label>
                    </div>
                  </div>

                  </div>

                  <div className="grid min-w-0 grid-cols-1 items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-100 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/30 xl:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)]">
                    <h4 className="xl:col-span-3 mb-0 text-center text-base font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Refraccion</h4>
                    <div className="min-w-0 rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                      <div className="mb-2 font-bold">Refraccion de lejos</div>
                      <div className="mb-2 grid grid-cols-[42px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2 text-center text-xs font-bold text-blue-900 dark:text-blue-200">
                        <div></div>
                        <div>ESF</div>
                        <div>CIL</div>
                        <div>EJE</div>
                      </div>
                      <div className="mb-2 grid grid-cols-[42px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2">
                        <div className="font-bold">OD</div>
                        <input type="text" name="ref_lejos_od_esf" value={formData.ref_lejos_od_esf} maxLength={7} onChange={handleInputChange} disabled={isReadOnly} className="h-8 w-full min-w-0 rounded border border-zinc-400 bg-white px-1 text-center text-sm font-semibold tabular-nums focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                        <input type="text" name="ref_lejos_od_cil" value={formData.ref_lejos_od_cil} maxLength={7} onChange={handleInputChange} disabled={isReadOnly} className="h-8 w-full min-w-0 rounded border border-zinc-400 bg-white px-1 text-center text-sm font-semibold tabular-nums focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                        <input type="text" name="ref_lejos_od_eje" value={formData.ref_lejos_od_eje} maxLength={3} onChange={handleInputChange} disabled={isReadOnly} className="h-8 min-w-0 rounded border border-zinc-400 bg-white px-1 text-center focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      </div>
                      <div className="grid grid-cols-[42px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2">
                        <div className="font-bold">OI</div>
                        <input type="text" name="ref_lejos_oi_esf" value={formData.ref_lejos_oi_esf} maxLength={7} onChange={handleInputChange} disabled={isReadOnly} className="h-8 w-full min-w-0 rounded border border-zinc-400 bg-white px-1 text-center text-sm font-semibold tabular-nums focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                        <input type="text" name="ref_lejos_oi_cil" value={formData.ref_lejos_oi_cil} maxLength={7} onChange={handleInputChange} disabled={isReadOnly} className="h-8 w-full min-w-0 rounded border border-zinc-400 bg-white px-1 text-center text-sm font-semibold tabular-nums focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                        <input type="text" name="ref_lejos_oi_eje" value={formData.ref_lejos_oi_eje} maxLength={3} onChange={handleInputChange} disabled={isReadOnly} className="h-8 min-w-0 rounded border border-zinc-400 bg-white px-1 text-center focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      </div>
                    </div>

                    <label className="flex w-[88px] shrink-0 flex-col items-center gap-2 rounded-md border border-[#2d8f8f] bg-white p-3 text-center font-bold text-[#2d8f8f] dark:border-emerald-500 dark:bg-zinc-950 dark:text-emerald-500">
                      ADD
                      <input
                        type="text"
                        name="add_value"
                        value={formData.add_value}
                        maxLength={7}
                        onChange={handleInputChange}
                        disabled={isReadOnly}
                        placeholder="+0.00"
                        className="h-9 w-full rounded border-2 border-[#2d8f8f] bg-white px-1 text-center text-sm font-bold tabular-nums focus:outline-none disabled:opacity-80 dark:border-emerald-500 dark:bg-zinc-900"
                      />
                    </label>

                    <div className="min-w-0 rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                      <div className="mb-2 font-bold">Refraccion de cerca</div>
                      <div className="mb-2 grid grid-cols-[42px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2 text-center text-xs font-bold text-blue-900 dark:text-blue-200">
                        <div></div>
                        <div>ESF</div>
                        <div>CIL</div>
                        <div>EJE</div>
                      </div>
                      <div className="mb-2 grid grid-cols-[42px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2">
                        <div className="font-bold">OD</div>
                        <input type="text" name="ref_cerca_od_esf" value={formData.ref_cerca_od_esf} maxLength={7} onChange={handleInputChange} disabled={isReadOnly} className="h-8 w-full min-w-0 rounded border border-zinc-400 bg-white px-1 text-center text-sm font-semibold tabular-nums focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                        <input type="text" name="ref_cerca_od_cil" value={formData.ref_cerca_od_cil} maxLength={7} onChange={handleInputChange} disabled={isReadOnly} className="h-8 w-full min-w-0 rounded border border-zinc-400 bg-white px-1 text-center text-sm font-semibold tabular-nums focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                        <input type="text" name="ref_cerca_od_eje" value={formData.ref_cerca_od_eje} maxLength={3} onChange={handleInputChange} disabled={isReadOnly} className="h-8 min-w-0 rounded border border-zinc-400 bg-white px-1 text-center focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      </div>
                      <div className="grid grid-cols-[42px_repeat(2,minmax(64px,1fr))_minmax(52px,0.8fr)] items-center gap-2">
                        <div className="font-bold">OI</div>
                        <input type="text" name="ref_cerca_oi_esf" value={formData.ref_cerca_oi_esf} maxLength={7} onChange={handleInputChange} disabled={isReadOnly} className="h-8 w-full min-w-0 rounded border border-zinc-400 bg-white px-1 text-center text-sm font-semibold tabular-nums focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                        <input type="text" name="ref_cerca_oi_cil" value={formData.ref_cerca_oi_cil} maxLength={7} onChange={handleInputChange} disabled={isReadOnly} className="h-8 w-full min-w-0 rounded border border-zinc-400 bg-white px-1 text-center text-sm font-semibold tabular-nums focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                        <input type="text" name="ref_cerca_oi_eje" value={formData.ref_cerca_oi_eje} maxLength={3} onChange={handleInputChange} disabled={isReadOnly} className="h-8 min-w-0 rounded border border-zinc-400 bg-white px-1 text-center focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="flex min-w-0 flex-col rounded-lg border border-zinc-300 bg-zinc-100 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/30">
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <label className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2 rounded-md border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
                      <span className="font-bold">OD</span>
                      <input type="text" name="pio_od" value={formData.pio_od} onChange={handleInputChange} disabled={isReadOnly} className="h-8 min-w-0 rounded border border-zinc-400 bg-white px-2 text-center focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      <span className="text-xs text-blue-900 dark:text-blue-200">mmHg</span>
                    </label>
                    <label className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2 rounded-md border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
                      <span className="font-bold">OI</span>
                      <input type="text" name="pio_oi" value={formData.pio_oi} onChange={handleInputChange} disabled={isReadOnly} className="h-8 min-w-0 rounded border border-zinc-400 bg-white px-2 text-center focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-900" />
                      <span className="text-xs text-blue-900 dark:text-blue-200">mmHg</span>
                    </label>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                    {[
                      { name: "biomicroscopia", label: "BMC", value: formData.biomicroscopia },
                      { name: "fondo_ojo", label: "FO", value: formData.fondo_ojo },
                      { name: "diagnostico", label: "DX", value: formData.diagnostico },
                      { name: "tratamiento", label: "TTO", value: formData.tratamiento },
                    ].map((field) => (
                      <label key={field.name} className="grid flex-1 grid-cols-[48px_minmax(0,1fr)] gap-2">
                        <span className="pt-2 font-bold">{field.label}</span>
                        <textarea
                          name={field.name}
                          value={field.value}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          rows={1}
                          className="min-h-10 resize-y rounded-md border border-zinc-400 bg-white px-3 py-2 focus:border-[#2d8f8f] focus:outline-none disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-950"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            </div>
            {/* Sección: RECETAS ASOCIADAS */}
              </div>
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
                    href={`/recetas/nueva?consulta_id=${activeConsultaId}&paciente_id=${formData.paciente_id}`}
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
                            {formatDate(receta.fecha)}
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
                        {receta.indicaciones && (
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            <span className="font-medium">Indicaciones:</span> {receta.indicaciones}
                          </p>
                        )}
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
            <div className="mt-8 flex flex-wrap justify-end gap-4 border-t border-zinc-300 pt-6 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => document.getElementById("clinical-context-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="rounded-lg border border-[#1f6b6b] bg-[#2d8f8f] px-6 py-2 font-bold text-white transition-colors hover:bg-[#1f6b6b] dark:bg-emerald-700 dark:hover:bg-emerald-600"
                aria-controls="clinical-context-panel"
              >
                Ver contexto
              </button>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={goToPatientDetail}
                  className="rounded-lg border border-zinc-400 px-6 py-2 font-bold text-zinc-700 transition-colors hover:bg-zinc-200 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Volver
                </button>
              )}
              <button 
                type="button" 
                onClick={isReadOnly ? goToPatientDetail : () => router.back()}
                className="px-6 py-2 border border-zinc-400 dark:border-zinc-600 rounded-lg font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                {isReadOnly ? "Volver" : "Cancelar"}
              </button>
              {showSaveActions && (
                <>
                  <button 
                    type="submit" 
                    value={currentConsultaEstado}
                    disabled={isLoading}
                    className="px-6 py-2 bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
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
                  {!isConsultaFinalizada && (
                    <button 
                      type="submit" 
                      value="finalizada"
                      disabled={isLoading}
                      className="px-6 py-2 bg-[#2d8f8f] hover:bg-[#1f6b6b] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "Guardando..." : "Finalizar consulta"}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}


