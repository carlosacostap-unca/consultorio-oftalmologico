"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import type { AppUser, Consulta, Mutual, Patient, Receta } from "@/lib/types";
import { isMergedPatient, patientDisplayName } from "@/lib/patient-merge";
import { consultaEstadoBadgeClass, consultaEstadoLabel } from "@/lib/consulta-estado";
import { doctorLabel } from "@/lib/doctor-attribution";
import { resolveActiveRole } from "@/lib/active-role";
import type { UserRole } from "@/lib/permissions";

export default function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: pacienteId } = React.use(params);
  
  const isViewMode = searchParams.get("mode") === "view";

  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mutuales, setMutuales] = useState<Mutual[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isLoadingConsultas, setIsLoadingConsultas] = useState(true);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [isLoadingRecetas, setIsLoadingRecetas] = useState(true);
  const [paciente, setPaciente] = useState<Patient | null>(null);
  const [clinicalTimelineFilter, setClinicalTimelineFilter] = useState<ClinicalTimelineFilter>("all");
  const [clinicalTimelineSearch, setClinicalTimelineSearch] = useState("");
  const [expandedClinicalTimelineEvent, setExpandedClinicalTimelineEvent] = useState<string | null>(null);
  const [showAllClinicalTimelineEvents, setShowAllClinicalTimelineEvents] = useState(false);
  const [consultaEditLimitDays, setConsultaEditLimitDays] = useState(7);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const isMerged = isMergedPatient(paciente);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    tipo_documento: "DNI",
    numero_documento: "",
    dni: "",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
    ocupacion: "",
    obra_social: "",
    mutual_id: "",
    numero_afiliado: "",
    domicilio: "",
    numero_ficha: "",
  });

  useEffect(() => {
    setIsMounted(true);
    const authUser = pb.authStore.record as AppUser | null;
    setUser(authUser);
    setActiveRole(resolveActiveRole(authUser));

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        // Cargar mutuales primero
        try {
          const mutualesRecords = await pb.collection("mutuales").getFullList<Mutual>({
            sort: "nombre",
          });
          setMutuales(mutualesRecords);
        } catch (error) {
          console.error("Error al cargar mutuales:", error);
        }

        try {
          const settingsResponse = await fetch("/api/configuracion", {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          });
          if (settingsResponse.ok) {
            const settings = await settingsResponse.json();
            if (settings?.consultaEditLimitDays !== undefined) {
              setConsultaEditLimitDays(settings.consultaEditLimitDays);
            }
          }
        } catch (error) {
          console.error("Error al cargar configuracion de consultas:", error);
        }

        // Luego cargar paciente
        const record = await pb.collection("pacientes").getOne<Patient>(pacienteId, {
          expand: "mutual_id,fusionado_en_paciente_id",
        });
        setPaciente(record);
        
        // Cargar historial de consultas
        try {
          const consultasRecords = await pb.collection("consultas").getFullList<Consulta>({
            filter: `paciente_id = "${pacienteId}"`,
            sort: "-fecha,-created",
            expand: "medico_id",
          });
          setConsultas(consultasRecords);
        } catch (error) {
          console.error("Error al cargar consultas:", error);
        } finally {
          setIsLoadingConsultas(false);
        }

        // Cargar recetas recientes del paciente para la ficha clinica
        try {
          const recetasRecords = await pb.collection("recetas").getFullList<Receta>({
            filter: `paciente_id = "${pacienteId}"`,
            sort: "-fecha,-created",
            expand: "consulta_id,medico_id",
          });
          setRecetas(recetasRecords);
        } catch (error) {
          console.error("Error al cargar recetas:", error);
        } finally {
          setIsLoadingRecetas(false);
        }
        
        let fechaNacimiento = "";
        if (record.fecha_nacimiento) {
          try {
            fechaNacimiento = new Date(record.fecha_nacimiento).toISOString().split('T')[0];
          } catch (e) {
            console.error("Error al formatear fecha:", e);
          }
        }

        setFormData({
          nombre: record.nombre || "",
          apellido: record.apellido || "",
          tipo_documento: record.tipo_documento || "DNI",
          numero_documento: record.numero_documento || record.dni || "",
          dni: record.dni || "",
          telefono: record.telefono || "",
          email: record.email || "",
          fecha_nacimiento: fechaNacimiento,
          ocupacion: record.ocupacion || "",
          obra_social: record.obra_social || "",
          mutual_id: record.mutual_id || "",
          numero_afiliado: record.numero_afiliado || "",
          domicilio: record.domicilio || "",
          numero_ficha: record.numero_ficha || "",
        });
      } catch (error) {
        console.error("Error al cargar paciente:", error);
        alert("No se pudo cargar la información del paciente.");
        router.push("/pacientes");
      } finally {
        setIsFetching(false);
      }
    };

    loadData();
  }, [router, pacienteId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateNumeroFicha = async () => {
    const numeroFicha = formData.numero_ficha.trim().toUpperCase();
    if (!numeroFicha) {
      return true;
    }

    const params = new URLSearchParams({
      numero_ficha: numeroFicha,
      exclude_id: pacienteId,
    });
    const response = await fetch(`/api/pacientes/ficha?${params}`);

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    if (data.exists) {
      const paciente = data.duplicate;
      alert(`El número de ficha ${numeroFicha} ya está asignado a ${paciente.apellido || ""}, ${paciente.nombre || ""}.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMerged) {
      alert("Este paciente fue fusionado. Edita el paciente principal.");
      return;
    }
    setIsLoading(true);
    try {
      const isNumeroFichaValid = await validateNumeroFicha();
      if (!isNumeroFichaValid) {
        setIsLoading(false);
        return;
      }

      const selectedMutual = mutuales.find((mutual) => mutual.id === formData.mutual_id);
      const dataToSave = {
        ...formData,
        nombre: formData.nombre.toUpperCase(),
        apellido: formData.apellido.toUpperCase(),
        obra_social: selectedMutual?.nombre || "",
        numero_ficha: formData.numero_ficha.toUpperCase()
      };
      await pb.collection("pacientes").update(pacienteId, dataToSave);
      router.push("/pacientes");
    } catch (error) {
      console.error("Error al actualizar paciente:", error);
      alert("Error al actualizar el paciente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este paciente?")) {
      return;
    }

    try {
      await pb.collection("pacientes").delete(pacienteId);
      router.push("/pacientes");
    } catch (error) {
      console.error("Error al eliminar paciente:", error);
      alert("Error al eliminar el paciente.");
    }
  };

  const pacienteNombre = paciente ? patientDisplayName(paciente) : `${formData.apellido}, ${formData.nombre}`;
  const documentoPaciente = formData.numero_documento || formData.dni || paciente?.numero_documento || paciente?.dni || "";
  const coberturaPaciente = paciente?.expand?.mutual_id?.nombre || formData.obra_social || "Sin cobertura";
  const ultimaConsulta = consultas[0];
  const consultasRecientes = consultas.slice(0, 3);
  const recetasRecientes = recetas.slice(0, 5);
  const ultimaReceta = recetasRecientes[0];
  const ultimoTratamiento = ultimaConsulta ? (ultimaConsulta as Consulta & { tratamiento?: string }).tratamiento || "" : "";
  const ultimaConsultaSummary = ultimaConsulta
    ? [formatDate(ultimaConsulta.fecha), ultimaConsulta.motivo_consulta?.trim(), ultimaConsulta.diagnostico?.trim()]
        .filter(Boolean)
        .join(" - ")
    : "";
  const continuitySuggestedAction = !isMerged
    ? !ultimaConsulta
      ? {
          label: "Iniciar primera consulta",
          detail: "No hay atenciones registradas para este paciente.",
          onClick: () => router.push(`/consultas/nueva?paciente_id=${pacienteId}`),
        }
      : ultimoTratamiento
        ? {
            label: "Crear receta",
            detail: "La ultima consulta tiene tratamiento indicado.",
            onClick: () => router.push(`/recetas/nueva?consulta_id=${ultimaConsulta.id}&paciente_id=${pacienteId}`),
          }
        : {
            label: "Abrir ultima consulta",
            detail: "Revisar la ultima atencion antes de continuar.",
            onClick: () => router.push(`/consultas/${ultimaConsulta.id}?mode=view`),
          }
    : null;
  const edadPaciente = getPatientAge(formData.fecha_nacimiento);
  const antecedentesActivos = getAntecedentesActivos(paciente);
  const canEditConsultasAsDoctor = activeRole === "medico";
  const clinicalTimelineAllEvents = buildClinicalTimeline(consultas, recetas, canEditConsultasAsDoctor, consultaEditLimitDays);
  const clinicalTimelineCounts = {
    all: clinicalTimelineAllEvents.length,
    consulta: clinicalTimelineAllEvents.filter((event) => event.type === "consulta").length,
    receta: clinicalTimelineAllEvents.filter((event) => event.type === "receta").length,
  };
  const clinicalTimelineSearchTerm = normalizeSearchText(clinicalTimelineSearch);
  const filteredClinicalTimelineEvents = clinicalTimelineAllEvents
    .filter((event) => clinicalTimelineFilter === "all" || event.type === clinicalTimelineFilter)
    .filter((event) => !clinicalTimelineSearchTerm || event.searchText.includes(clinicalTimelineSearchTerm));
  const visibleClinicalTimelineEvents = showAllClinicalTimelineEvents
    ? filteredClinicalTimelineEvents
    : filteredClinicalTimelineEvents.slice(0, 8);
  const hiddenClinicalTimelineEventsCount = Math.max(filteredClinicalTimelineEvents.length - visibleClinicalTimelineEvents.length, 0);
  const isLoadingClinicalTimeline = isLoadingConsultas || isLoadingRecetas;

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
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
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {isViewMode ? "Ver Paciente" : "Editar Paciente"}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                {isViewMode ? "Detalles del paciente" : "Modifica los datos del paciente"}
              </p>
            </div>
          </div>
          {!isFetching && (
            <div className="flex items-center gap-3 sm:justify-end">
              {isViewMode && !isMerged && (
                <button
                  type="button"
                  onClick={() => router.push(`/pacientes/${pacienteId}`)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/30"
                >
                  Editar
                </button>
              )}
              {!isMerged && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-700 dark:text-red-300 rounded-xl font-medium transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>

        {isMerged && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
            <div className="font-semibold">Paciente fusionado</div>
            <p className="mt-1 text-sm">
              Este registro fue archivado como duplicado y sus turnos, consultas y recetas fueron reasignados.
            </p>
            {paciente?.expand?.fusionado_en_paciente_id && (
              <button
                type="button"
                onClick={() => router.push(`/pacientes/${paciente.expand?.fusionado_en_paciente_id?.id}?mode=view`)}
                className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Abrir paciente principal: {patientDisplayName(paciente.expand.fusionado_en_paciente_id)}
              </button>
            )}
          </div>
        )}

        {isViewMode && !isFetching && (
          <div className="mb-8 space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Ficha clinica del paciente</p>
                  <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{pacienteNombre}</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {formData.numero_ficha ? `Ficha ${formData.numero_ficha}` : "Sin ficha"}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {documentoPaciente ? `${formData.tipo_documento || "DNI"} ${documentoPaciente}` : "Sin documento"}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {edadPaciente || "Edad no registrada"}
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {coberturaPaciente}
                    </span>
                  </div>
                </div>
                {!isMerged && (
                  <div className="flex flex-col gap-2 print:hidden sm:flex-row lg:justify-end">
                    <button
                      type="button"
                      onClick={() => router.push(`/consultas/nueva?paciente_id=${pacienteId}`)}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-blue-700"
                    >
                      Nueva consulta
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/recetas/nueva?paciente_id=${pacienteId}`)}
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Nueva receta
                    </button>
                    {ultimaConsulta && (
                      <button
                        type="button"
                        onClick={() => router.push(`/consultas/${ultimaConsulta.id}?mode=view`)}
                        className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Abrir ultima consulta
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => router.push(`/pacientes/${pacienteId}/imprimir`)}
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Imprimir ficha
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ClinicalMetric label="Consultas" value={`${consultas.length}`} detail={consultas.length === 1 ? "1 consulta registrada" : `${consultas.length} consultas registradas`} />
                <ClinicalMetric label="Recetas" value={`${recetas.length}`} detail={recetas.length === 1 ? "1 receta emitida" : `${recetas.length} recetas emitidas`} />
                <ClinicalMetric label="Ultima atencion" value={ultimaConsulta?.fecha ? formatDate(ultimaConsulta.fecha) : "-"} detail={ultimaConsulta?.motivo_consulta || "Sin consultas registradas"} />
              </div>

              <div aria-label="Continuidad actual del paciente" className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Continuidad actual</p>
                    <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Lectura rapida para la proxima accion</h3>
                    {continuitySuggestedAction && (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{continuitySuggestedAction.detail}</p>
                    )}
                  </div>
                  {continuitySuggestedAction && (
                    <button
                      type="button"
                      onClick={continuitySuggestedAction.onClick}
                      className="print:hidden rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-blue-700"
                    >
                      {continuitySuggestedAction.label}
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-blue-100 bg-white p-4 dark:border-blue-900/60 dark:bg-zinc-950">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Ultima consulta</h4>
                    {ultimaConsulta ? (
                      <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">{formatDate(ultimaConsulta.fecha)}</div>
                        <p><span className="font-medium text-zinc-800 dark:text-zinc-200">Medico:</span> {doctorLabel(ultimaConsulta.expand?.medico_id)}</p>
                        {completedConsultaSummaryFields(ultimaConsulta, ultimoTratamiento).map((field) => (
                          <p key={field.label}><span className="font-medium text-zinc-800 dark:text-zinc-200">{field.label}:</span> {field.value}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No hay consultas registradas.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-white p-4 dark:border-blue-900/60 dark:bg-zinc-950">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Ultima receta</h4>
                    {ultimaReceta ? (
                      <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-300">{formatDate(ultimaReceta.fecha || ultimaReceta.created)}</div>
                        <p><span className="font-medium text-zinc-800 dark:text-zinc-200">Medicamentos:</span> {ultimaReceta.medicamentos || "-"}</p>
                        <p><span className="font-medium text-zinc-800 dark:text-zinc-200">Indicaciones:</span> {ultimaReceta.indicaciones || "-"}</p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No hay recetas recientes registradas.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ClinicalInfoBlock
                  title="Contacto"
                  rows={[
                    ["Telefono", formData.telefono || "-"],
                    ["Email", formData.email || "-"],
                    ["Domicilio", formData.domicilio || "-"],
                    ["Ocupacion", formData.ocupacion || "-"],
                  ]}
                />
                <ClinicalInfoBlock
                  title="Cobertura"
                  rows={[
                    ["Obra social", coberturaPaciente],
                    ["Afiliado", formData.numero_afiliado || "-"],
                    ["Nacimiento", formatDate(formData.fecha_nacimiento)],
                  ]}
                />
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Antecedentes activos</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {antecedentesActivos.length === 0 ? (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Sin antecedentes activos.</span>
                    ) : (
                      antecedentesActivos.map((antecedente) => (
                        <span key={antecedente} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {antecedente}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Ultima consulta</h3>
                    {ultimaConsulta ? (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {ultimaConsultaSummary}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">No hay consultas registradas.</p>
                    )}
                  </div>
                  {ultimaConsulta && (
                    <button
                      type="button"
                      onClick={() => router.push(`/consultas/${ultimaConsulta.id}?mode=view`)}
                      className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-white dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      Abrir consulta
                    </button>
                  )}
                </div>
              </div>

              <div aria-label="Continuidad clinica del paciente" className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Continuidad clinica</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Ultimas consultas para orientar la atencion actual</p>
                  </div>
                  {!isMerged && (
                    <button
                      type="button"
                      onClick={() => router.push(`/consultas/nueva?paciente_id=${pacienteId}`)}
                      className="print:hidden rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Agregar consulta
                    </button>
                  )}
                </div>

                {isLoadingConsultas ? (
                  <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Cargando continuidad...</div>
                ) : consultasRecientes.length === 0 ? (
                  <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No hay consultas registradas para mostrar continuidad.</div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {consultasRecientes.map((consulta) => {
                      const tratamiento = (consulta as Consulta & { tratamiento?: string }).tratamiento;
                      const visibleFields = completedConsultaSummaryFields(consulta, tratamiento);
                      const editHref = canEditConsultasAsDoctor && isConsultaEditable(consulta.fecha, consultaEditLimitDays)
                        ? `/consultas/${consulta.id}`
                        : undefined;
                      return (
                        <div key={consulta.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">{formatDate(consulta.fecha)}</div>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${consultaEstadoBadgeClass(consulta.estado)}`}>
                              {consultaEstadoLabel(consulta.estado)}
                            </span>
                          </div>
                          {consulta.motivo_consulta?.trim() && (
                            <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{consulta.motivo_consulta}</div>
                          )}
                          <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                            <p><span className="font-medium text-zinc-800 dark:text-zinc-200">Medico:</span> {doctorLabel(consulta.expand?.medico_id)}</p>
                            {visibleFields.filter((field) => field.label !== "Motivo").map((field) => (
                              <p key={field.label}><span className="font-medium text-zinc-800 dark:text-zinc-200">{field.label}:</span> {field.value}</p>
                            ))}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                            <button
                              type="button"
                              onClick={() => router.push(`/consultas/${consulta.id}?mode=view`)}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                              Abrir consulta
                            </button>
                            {editHref && (
                              <button
                                type="button"
                                onClick={() => router.push(editHref)}
                                className="rounded-lg bg-[#2d8f8f] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1f6b6b]"
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div aria-label="Historia clinica del paciente" className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Historia clinica</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Linea de tiempo con consultas y recetas recientes</p>
                  </div>
                  <div className="print:hidden flex flex-wrap gap-2">
                    {[
                      { key: "all" as const, label: "Todo", count: clinicalTimelineCounts.all },
                      { key: "consulta" as const, label: "Consultas", count: clinicalTimelineCounts.consulta },
                      { key: "receta" as const, label: "Recetas", count: clinicalTimelineCounts.receta },
                    ].map((filter) => {
                      const isActive = clinicalTimelineFilter === filter.key;
                      return (
                        <button
                          key={filter.key}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setClinicalTimelineFilter(filter.key)}
                          className={isActive
                            ? "rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/30"
                            : "rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"}
                        >
                          {filter.label} <span className="ml-1 opacity-80">{filter.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 print:hidden sm:flex-row">
                  <input
                    type="search"
                    value={clinicalTimelineSearch}
                    onChange={(event) => setClinicalTimelineSearch(event.target.value)}
                    placeholder="Buscar en historia clinica"
                    aria-label="Buscar en historia clinica"
                    className="min-h-10 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  {clinicalTimelineSearch && (
                    <button
                      type="button"
                      onClick={() => setClinicalTimelineSearch("")}
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {isLoadingClinicalTimeline ? (
                  <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Cargando historia clinica...</div>
                ) : visibleClinicalTimelineEvents.length === 0 ? (
                  <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    {clinicalTimelineSearchTerm
                      ? "No hay eventos clinicos que coincidan con la busqueda."
                      : clinicalTimelineFilter === "all"
                      ? "No hay eventos clinicos recientes para mostrar."
                      : `No hay ${clinicalTimelineFilter === "consulta" ? "consultas" : "recetas"} recientes para mostrar.`}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {visibleClinicalTimelineEvents.map((event) => {
                      const isExpanded = expandedClinicalTimelineEvent === event.key;
                      return (
                        <div
                          key={event.key}
                          className="grid grid-cols-1 gap-3 border-l-2 border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                        >
                          <div>
                            <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{formatDate(event.date)}</div>
                            <span className={event.type === "consulta" ? "mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}>
                              {event.type === "consulta" ? "Consulta" : "Receta"}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</div>
                            <p className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-500">Medico: {event.doctor}</p>
                            {event.description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{event.description}</p>}
                            {event.secondary && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">{event.secondary}</p>}
                            {isExpanded && (
                              <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
                                {event.detailRows.map((row) => (
                                  <div key={row.label} className="min-w-0">
                                    <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{row.label}</dt>
                                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{row.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                          </div>
                          <div className="flex flex-wrap items-start gap-2 print:hidden sm:justify-end">
                            <button
                              type="button"
                              onClick={() => setExpandedClinicalTimelineEvent(isExpanded ? null : event.key)}
                              aria-expanded={isExpanded}
                              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                            >
                              {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(event.primaryHref)}
                              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                            >
                              {event.type === "consulta" ? "Abrir consulta" : "Ver receta"}
                            </button>
                            {event.editHref && (
                              <button
                                type="button"
                                onClick={() => router.push(event.editHref!)}
                                className="rounded-lg bg-[#2d8f8f] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#1f6b6b]"
                              >
                                Editar
                              </button>
                            )}
                            {event.printHref && (
                              <button
                                type="button"
                                onClick={() => router.push(event.printHref!)}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                              >
                                Imprimir
                              </button>
                            )}
                            {event.newPrescriptionHref && (
                              <button
                                type="button"
                                onClick={() => router.push(event.newPrescriptionHref!)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                              >
                                Nueva receta
                              </button>
                            )}
                            {event.linkedConsultaHref && (
                              <button
                                type="button"
                                onClick={() => router.push(event.linkedConsultaHref!)}
                                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                              >
                                Consulta vinculada
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredClinicalTimelineEvents.length > 8 && (
                      <div className="flex justify-center pt-1 print:hidden">
                        <button
                          type="button"
                          onClick={() => setShowAllClinicalTimelineEvents((current) => !current)}
                          className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                          {showAllClinicalTimelineEvents
                            ? "Mostrar menos"
                            : `Mostrar mas (${hiddenClinicalTimelineEventsCount})`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-3 border-b border-zinc-200 p-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">Recetas recientes</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Indicaciones emitidas para este paciente</p>
                </div>
                {!isMerged && (
                  <button
                    type="button"
                    onClick={() => router.push(`/recetas/nueva?paciente_id=${pacienteId}`)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Nueva receta
                  </button>
                )}
              </div>
              {isLoadingRecetas ? (
                <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">Cargando recetas...</div>
              ) : recetasRecientes.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">No hay recetas registradas para este paciente.</div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {recetasRecientes.map((receta) => (
                    <div
                      key={receta.id}
                      className="grid grid-cols-1 gap-3 px-6 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 lg:grid-cols-[130px_minmax(0,1fr)_auto]"
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDate(receta.fecha)}</span>
                      <div className="min-w-0 text-sm text-zinc-600 dark:text-zinc-400">
                        <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">{receta.medicamentos || "Sin medicamentos cargados"}</div>
                        <div className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-500">Medico: {doctorLabel(receta.expand?.medico_id)}</div>
                        {receta.indicaciones && <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-500">{receta.indicaciones}</div>}
                        <div className="mt-2 text-xs">
                          {receta.consulta_id ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Vinculada a consulta {receta.expand?.consulta_id?.fecha ? formatDate(receta.expand.consulta_id.fecha) : ""}
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              Receta libre
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-start gap-2 print:hidden lg:justify-end">
                        <button
                          type="button"
                          onClick={() => router.push(`/recetas/${receta.id}?mode=view`)}
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/recetas/${receta.id}/imprimir`)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                        >
                          Imprimir
                        </button>
                        {receta.consulta_id && (
                          <button
                            type="button"
                            onClick={() => router.push(`/consultas/${receta.consulta_id}?mode=view`)}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          >
                            Consulta
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {isFetching ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              Cargando datos del paciente...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Datos Personales */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Datos Personales</h3>
                  
                  <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Apellido *</label>
                <input required type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} disabled={isViewMode || isMerged} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 uppercase disabled:opacity-70" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre *</label>
                  <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} disabled={isViewMode || isMerged} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 uppercase disabled:opacity-70" />
                </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Tipo de Documento
                    </label>
                    <select
                      name="tipo_documento"
                      value={formData.tipo_documento || 'DNI'}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
                    >
                      <option value="DNI">DNI</option>
                      <option value="LC">LC</option>
                      <option value="LE">LE</option>
                      <option value="PASAPORTE">Pasaporte</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Número de Documento *
                    </label>
                    <input
                      type="text"
                      name="numero_documento"
                      value={formData.numero_documento || formData.dni || ''} // Fallback para compatibilidad con registros antiguos
                      onChange={handleInputChange}
                      disabled={isViewMode}
                      required
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Número de Ficha</label>
                    <input type="text" name="numero_ficha" value={formData.numero_ficha} onChange={handleInputChange} disabled={isViewMode} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 uppercase disabled:opacity-70" placeholder="Ej: A-123" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha de Nacimiento</label>
                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleInputChange} disabled={isViewMode} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark] disabled:opacity-70" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Ocupacion</label>
                    <input type="text" name="ocupacion" value={formData.ocupacion} onChange={handleInputChange} disabled={isViewMode} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70" />
                  </div>
                </div>

                {/* Contacto y Cobertura */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Contacto y Cobertura</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Teléfono</label>
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange} disabled={isViewMode} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={isViewMode} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Domicilio</label>
                    <input type="text" name="domicilio" value={formData.domicilio} onChange={handleInputChange} disabled={isViewMode} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Obra Social / Prepaga</label>
                    <select 
                      name="mutual_id" 
                      value={formData.mutual_id} 
                      onChange={handleInputChange} 
                      disabled={isViewMode}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70"
                    >
                      <option value="">Seleccione una obra social...</option>
                      {mutuales.map(mutual => (
                        <option key={mutual.id} value={mutual.id}>
                          {mutual.nombre} {mutual.codigo ? `(${mutual.codigo})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nº de Afiliado</label>
                    <input type="text" name="numero_afiliado" value={formData.numero_afiliado} onChange={handleInputChange} disabled={isViewMode} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 disabled:opacity-70" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <button 
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors"
                >
                  {isViewMode ? "Volver" : "Cancelar"}
                </button>
                {!isViewMode && !isMerged && (
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? "Guardando..." : "Guardar Cambios"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Historial de Consultas */}
        {!isFetching && (
          <div className="mt-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">Historial de Consultas</h3>
              {!isMerged && (
                <button
                  type="button"
                  onClick={() => router.push(`/consultas/nueva?paciente_id=${pacienteId}`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/30"
                >
                  Nueva consulta
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              {isLoadingConsultas ? (
                <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
                  Cargando historial...
                </div>
              ) : consultas.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
                  No hay consultas registradas para este paciente.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Medico</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Motivo</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Diagnóstico</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {consultas.map((consulta) => {
                      // Usar try-catch para la fecha por si hay algún formato inválido
                      let fechaStr = "-";
                      try {
                        if (consulta.fecha) {
                          fechaStr = new Date(consulta.fecha).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
                        }
                      } catch {}
                      const editHref = canEditConsultasAsDoctor && isConsultaEditable(consulta.fecha, consultaEditLimitDays)
                        ? `/consultas/${consulta.id}`
                        : undefined;

                      return (
                        <tr
                          key={consulta.id}
                          tabIndex={0}
                          onClick={() => router.push(`/consultas/${consulta.id}?mode=view`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/consultas/${consulta.id}?mode=view`);
                            }
                          }}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                            {fechaStr}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {doctorLabel(consulta.expand?.medico_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${consultaEstadoBadgeClass(consulta.estado)}`}>
                              {consultaEstadoLabel(consulta.estado)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={consulta.motivo_consulta}>
                            {consulta.motivo_consulta || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={consulta.diagnostico}>
                            {consulta.diagnostico || "-"}
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            <div className="flex flex-wrap justify-end gap-2 print:hidden">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/consultas/${consulta.id}?mode=view`);
                                }}
                                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                              >
                                Ver
                              </button>
                              {editHref && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    router.push(editHref);
                                  }}
                                  className="rounded-lg bg-[#2d8f8f] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#1f6b6b]"
                                >
                                  Editar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClinicalInfoBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[90px_1fr] gap-3 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="min-w-0 truncate text-zinc-900 dark:text-zinc-100" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type ClinicalTimelineEvent = {
  key: string;
  type: "consulta" | "receta";
  date?: string;
  title: string;
  description: string;
  secondary?: string;
  doctor: string;
  primaryHref: string;
  editHref?: string;
  printHref?: string;
  newPrescriptionHref?: string;
  linkedConsultaHref?: string;
  detailRows: Array<{ label: string; value: string }>;
  searchText: string;
};

type ClinicalTimelineFilter = "all" | ClinicalTimelineEvent["type"];

function completedConsultaSummaryFields(consulta: Consulta, tratamiento?: string) {
  return [
    { label: "Motivo", value: consulta.motivo_consulta?.trim() || "" },
    { label: "Diagnostico", value: consulta.diagnostico?.trim() || "" },
    { label: "Tratamiento", value: tratamiento?.trim() || "" },
  ].filter((field) => field.value.length > 0);
}

function buildClinicalTimeline(
  consultas: Consulta[],
  recetas: Receta[],
  canEditConsultasAsDoctor: boolean,
  consultaEditLimitDays: number
): ClinicalTimelineEvent[] {
  const consultaEvents = consultas.map((consulta) => {
    const tratamiento = (consulta as Consulta & { tratamiento?: string }).tratamiento;
    const title = consulta.motivo_consulta || "Consulta sin motivo cargado";
    const description = consulta.diagnostico ? `Diagnostico: ${consulta.diagnostico}` : "";
    const secondary = tratamiento ? `Tratamiento: ${tratamiento}` : undefined;
    const doctor = doctorLabel(consulta.expand?.medico_id);
    return {
      key: `consulta-${consulta.id}`,
      type: "consulta" as const,
      date: consulta.fecha,
      title,
      description,
      secondary,
      doctor,
      primaryHref: `/consultas/${consulta.id}?mode=view`,
      editHref: canEditConsultasAsDoctor && isConsultaEditable(consulta.fecha, consultaEditLimitDays)
        ? `/consultas/${consulta.id}`
        : undefined,
      printHref: `/consultas/${consulta.id}/imprimir`,
      newPrescriptionHref: `/recetas/nueva?consulta_id=${consulta.id}&paciente_id=${consulta.paciente_id}`,
      detailRows: [
        { label: "Fecha", value: formatDate(consulta.fecha) },
        { label: "Medico", value: doctor },
        { label: "Estado", value: consultaEstadoLabel(consulta.estado) },
        ...completedConsultaSummaryFields(consulta, tratamiento),
      ],
      searchText: buildEventSearchText(["consulta", doctor, consultaEstadoLabel(consulta.estado), formatDate(consulta.fecha), title, description, secondary]),
    };
  });

  const recetaEvents = recetas.map((receta) => {
    const date = receta.fecha || receta.created;
    const title = receta.medicamentos || "Receta sin medicamentos cargados";
    const description = receta.indicaciones || "Sin indicaciones cargadas.";
    const secondary = receta.consulta_id
      ? `Vinculada a consulta${receta.expand?.consulta_id?.fecha ? ` del ${formatDate(receta.expand.consulta_id.fecha)}` : ""}`
      : "Receta libre";
    const doctor = doctorLabel(receta.expand?.medico_id);

    return {
      key: `receta-${receta.id}`,
      type: "receta" as const,
      date,
      title,
      description,
      secondary,
      doctor,
      primaryHref: `/recetas/${receta.id}?mode=view`,
      printHref: `/recetas/${receta.id}/imprimir`,
      linkedConsultaHref: receta.consulta_id ? `/consultas/${receta.consulta_id}?mode=view` : undefined,
      detailRows: [
        { label: "Fecha", value: formatDate(date) },
        { label: "Medico", value: doctor },
        { label: "Medicamentos", value: title },
        { label: "Indicaciones", value: receta.indicaciones || "-" },
        { label: "Vinculacion", value: secondary },
      ],
      searchText: buildEventSearchText(["receta", doctor, formatDate(date), title, description, secondary]),
    };
  });

  return [...consultaEvents, ...recetaEvents].sort((a, b) => getDateTime(b.date) - getDateTime(a.date));
}

function buildEventSearchText(parts: Array<string | undefined>) {
  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getDateTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isConsultaEditable(fecha: string | undefined, limitDays: number) {
  if (!fecha) return true;

  const consultaDate = new Date(fecha);
  if (Number.isNaN(consultaDate.getTime())) return false;

  const today = startOfDay(new Date());
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - limitDays);

  return consultaDate >= minDate;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function ClinicalMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400" title={detail}>{detail}</div>
    </div>
  );
}

function getAntecedentesActivos(paciente: Patient | null) {
  if (!paciente) return [];

  return [
    paciente.ant_diabetes ? "Diabetes" : "",
    paciente.ant_glaucoma ? "Glaucoma" : "",
    paciente.ant_maculopatia ? "Maculopatia" : "",
    paciente.ant_asmatico ? "Asmatico" : "",
    paciente.ant_hipertension ? "Hipertension" : "",
    paciente.ant_alergico ? "Alergico" : "",
    paciente.ant_reuma ? "Reuma" : "",
    paciente.ant_herpes ? "Herpes" : "",
    paciente.ant_otra?.trim() || "",
  ].filter(Boolean);
}

function getPatientAge(fechaNacimiento: string) {
  if (!fechaNacimiento) return "";

  const birthDate = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age} anos`;
}

function formatDate(value?: string) {
  if (!value) return "-";

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-");
      return `${day}/${month}/${year}`;
    }

    return new Date(value).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  } catch {
    return "-";
  }
}
