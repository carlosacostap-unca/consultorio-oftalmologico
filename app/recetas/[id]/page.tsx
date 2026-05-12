"use client";

import { useEffect, useState, Suspense } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { use } from "react";
import type { Consulta, Patient, Receta } from "@/lib/types";
import { appendActivePatientFilter } from "@/lib/patient-merge";

export default function EditarRecetaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <EditarRecetaForm recetaId={resolvedParams.id} />
    </Suspense>
  );
}

function EditarRecetaForm({ recetaId }: { recetaId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isViewMode = searchParams.get("mode") === "view";
  
  const [isMounted, setIsMounted] = useState(false);
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedPacienteData, setSelectedPacienteData] = useState<Patient | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [debouncedPatientSearchQuery, setDebouncedPatientSearchQuery] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);

  const [formData, setFormData] = useState({
    paciente_id: "",
    consulta_id: "",
    fecha: new Date().toISOString().split('T')[0],
    medicamentos: "",
    indicaciones: "",
  });

  const patientDocument = (patient?: Patient | null) => patient?.numero_documento || patient?.dni || "";
  const formatPatientOption = (patient: Patient) => {
    const document = patientDocument(patient);
    return `${patient.apellido}, ${patient.nombre}${document ? ` - DNI: ${document}` : ""}${patient.numero_ficha ? ` - Ficha: ${patient.numero_ficha}` : ""}`;
  };
  const upsertPatient = (patient: Patient) => {
    setPacientes((prev) => [patient, ...prev.filter((item) => item.id !== patient.id)]);
  };
  const buildPatientFilter = (query: string) => {
    const searchVal = query.toLowerCase().replace(/"/g, '\\"');
    const terms = searchVal.split(/\s+/).filter((term) => term.length > 0);

    if (terms.length === 0) {
      return appendActivePatientFilter("");
    }

    const termFilters = terms.map((term) => `(nombre ~ "${term}" || apellido ~ "${term}" || numero_documento ~ "${term}" || dni ~ "${term}" || numero_ficha ~ "${term}")`);
    return appendActivePatientFilter(termFilters.join(" && "));
  };
  const displayValue = (value?: string | null) => {
    const normalized = String(value ?? "").trim();
    return normalized || "-";
  };
  const selectedConsultaData = consultas.find((consulta) => consulta.id === formData.consulta_id) || null;
  const patientSummary = selectedPacienteData
    ? [
        patientDocument(selectedPacienteData) ? `DNI ${patientDocument(selectedPacienteData)}` : "",
        selectedPacienteData.numero_ficha ? `Ficha ${selectedPacienteData.numero_ficha}` : "",
        selectedPacienteData.obra_social || "",
      ].filter(Boolean)
    : [];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatientSearchQuery(patientSearchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [patientSearchQuery]);

  useEffect(() => {
    setIsMounted(true);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        if (recetaId) {
          const recetaRecord = await pb.collection("recetas").getOne<Receta>(recetaId);
          
          let fechaFormateada = new Date().toISOString().split('T')[0];
          try {
            if (recetaRecord.fecha) {
              fechaFormateada = new Date(recetaRecord.fecha).toISOString().split('T')[0];
            }
          } catch (e) {
            console.error("Error al parsear fecha", e);
          }

          setFormData({
            paciente_id: recetaRecord.paciente_id || "",
            consulta_id: recetaRecord.consulta_id || "",
            fecha: fechaFormateada,
            medicamentos: recetaRecord.medicamentos || "",
            indicaciones: recetaRecord.indicaciones || "",
          });

          if (recetaRecord.paciente_id) {
            try {
              const paciente = await pb.collection("pacientes").getOne<Patient>(recetaRecord.paciente_id);
              setSelectedPacienteData(paciente);
              setPatientSearchQuery(formatPatientOption(paciente));
              upsertPatient(paciente);
            } catch (patientError) {
              console.error("Error al cargar paciente de la receta:", patientError);
            }
          }

          // Cargar consultas de ese paciente
          if (recetaRecord.paciente_id) {
            const consultasRecords = await pb.collection("consultas").getFullList<Consulta>({
              filter: `paciente_id = "${recetaRecord.paciente_id}"`,
              sort: "-fecha",
            });
            setConsultas(consultasRecords);
          }
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [router, recetaId]);

  // Cargar consultas cuando cambia el paciente
  useEffect(() => {
    if (!isInitialLoading && formData.paciente_id) {
      const loadConsultas = async () => {
        try {
          const consultasRecords = await pb.collection("consultas").getFullList<Consulta>({
            filter: `paciente_id = "${formData.paciente_id}"`,
            sort: "-fecha",
          });
          setConsultas(consultasRecords);
        } catch (error) {
          console.error("Error al cargar consultas:", error);
        }
      };
      loadConsultas();
    } else if (!formData.paciente_id) {
      setConsultas([]);
    }
  }, [formData.paciente_id, isInitialLoading]);

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid || formData.paciente_id || isViewMode) {
      return;
    }

    const loadPatientResults = async () => {
      setIsSearchingPatients(true);
      try {
        const result = await pb.collection("pacientes").getList<Patient>(1, 20, {
          sort: "apellido,nombre",
          filter: buildPatientFilter(debouncedPatientSearchQuery),
          requestKey: null,
        });
        setPacientes(result.items);
      } catch (error) {
        console.error("Error al buscar pacientes:", error);
      } finally {
        setIsSearchingPatients(false);
      }
    };

    loadPatientResults();
  }, [isMounted, formData.paciente_id, debouncedPatientSearchQuery, isViewMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.paciente_id) {
      alert("Selecciona un paciente de la lista.");
      return;
    }

    setIsLoading(true);

    try {
      const fechaConHora = `${formData.fecha} 12:00:00.000Z`;

      await pb.collection("recetas").update(recetaId, {
        paciente_id: formData.paciente_id,
        consulta_id: formData.consulta_id || null,
        fecha: fechaConHora,
        medicamentos: formData.medicamentos,
        indicaciones: formData.indicaciones,
      });

      router.push("/recetas");
    } catch (error) {
      console.error("Error al actualizar receta:", error);
      alert(error instanceof Error ? error.message : "Error al actualizar la receta");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/recetas"
            className="p-2 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {isViewMode ? "Ver Receta" : "Editar Receta"}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              {isViewMode ? "Detalles de la receta médica" : "Modificá los datos de la receta"}
            </p>
          </div>
        </div>

        {isInitialLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Resumen de receta</p>
                  <h2 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedPacienteData ? `${selectedPacienteData.apellido}, ${selectedPacienteData.nombre}` : "Paciente"}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold dark:bg-zinc-800">Receta {formatDate(formData.fecha)}</span>
                    {patientSummary.map((item) => (
                      <span key={item} className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium dark:bg-zinc-800">{item}</span>
                    ))}
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                      {formData.consulta_id ? "Vinculada a consulta" : "Receta libre"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/recetas/${recetaId}/imprimir`} className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white hover:bg-orange-700">
                    Imprimir receta
                  </Link>
                  {formData.consulta_id && (
                    <Link href={`/consultas/${formData.consulta_id}`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      Volver a consulta
                    </Link>
                  )}
                  {formData.consulta_id && (
                    <Link href={`/consultas/${formData.consulta_id}/imprimir-anteojos`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      Imprimir anteojos
                    </Link>
                  )}
                  {formData.paciente_id && (
                    <Link href={`/pacientes/${formData.paciente_id}?mode=view`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      Ver paciente
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/60 md:col-span-2">
                  <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Medicamentos / anteojos</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayValue(formData.medicamentos)}</div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/60">
                  <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Consulta relacionada</div>
                  <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedConsultaData?.fecha ? formatDate(selectedConsultaData.fecha) : "Sin consulta vinculada"}
                  </div>
                  {selectedConsultaData?.diagnostico && (
                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">{selectedConsultaData.diagnostico}</div>
                  )}
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/60 md:col-span-3">
                  <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Indicaciones</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">{displayValue(formData.indicaciones)}</div>
                </div>
              </div>
            </section>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Paciente *
                    </label>
                    <div className="relative">
                      <input
                        required
                        disabled={isViewMode}
                        type="text"
                        value={patientSearchQuery}
                        onChange={(e) => {
                          setPatientSearchQuery(e.target.value);
                          setShowPatientDropdown(true);
                          if (formData.paciente_id) {
                            setFormData({ ...formData, paciente_id: "", consulta_id: "" });
                            setSelectedPacienteData(null);
                          }
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                        placeholder="Buscar por apellido, nombre, documento o ficha"
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100 disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                      />
                      {showPatientDropdown && !formData.paciente_id && !isViewMode && (
                        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                          {isSearchingPatients ? (
                            <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Buscando pacientes...</div>
                          ) : pacientes.length > 0 ? pacientes.map((paciente) => (
                            <button
                              key={paciente.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setFormData({ ...formData, paciente_id: paciente.id, consulta_id: "" });
                                setSelectedPacienteData(paciente);
                                setPatientSearchQuery(formatPatientOption(paciente));
                                setShowPatientDropdown(false);
                              }}
                              className="block w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                              <span className="block font-semibold text-zinc-900 dark:text-zinc-100">{paciente.apellido}, {paciente.nombre}</span>
                              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                {patientDocument(paciente) ? `DNI ${patientDocument(paciente)}` : "Sin documento"}{paciente.numero_ficha ? ` - Ficha ${paciente.numero_ficha}` : ""}
                              </span>
                            </button>
                          )) : (
                            <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">No hay pacientes para mostrar.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Fecha de Receta *
                    </label>
                    <input
                      type="date"
                      required
                      disabled={isViewMode}
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:[color-scheme:dark] dark:text-zinc-100 disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                    />
                  </div>
                </div>

                {formData.paciente_id && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Consulta Relacionada (Opcional)
                    </label>
                    <div className="flex gap-2">
                      <select
                        disabled={isViewMode}
                        value={formData.consulta_id}
                        onChange={(e) => setFormData({ ...formData, consulta_id: e.target.value })}
                        className="flex-grow px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100 disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                      >
                        <option value="">Ninguna o crear sin consulta</option>
                        {consultas.map((consulta) => (
                          <option key={consulta.id} value={consulta.id}>
                            {formatDate(consulta.fecha)} - {consulta.diagnostico ? consulta.diagnostico.substring(0, 50) + "..." : "Sin diagnóstico"}
                          </option>
                        ))}
                      </select>
                      {formData.consulta_id && (
                        <button
                          type="button"
                          onClick={() => window.open(`/consultas/${formData.consulta_id}/imprimir-anteojos`, '_blank')}
                          className="px-4 py-2.5 bg-[#2d8f8f] hover:bg-[#1f6b6b] text-white rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                          title="Imprimir receta de anteojos (Lejos y Cerca) de esta consulta"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Imprimir Anteojos
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <hr className="border-zinc-200 dark:border-zinc-800" />

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Medicamentos / Anteojos *
                  </label>
                  <textarea
                    required
                    disabled={isViewMode}
                    value={formData.medicamentos}
                    onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                    rows={4}
                    placeholder="Ej. Lentes de contacto, Gotas oftálmicas..."
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100 resize-none disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Indicaciones / Uso
                  </label>
                  <textarea
                    value={formData.indicaciones}
                    disabled={isViewMode}
                    onChange={(e) => setFormData({ ...formData, indicaciones: e.target.value })}
                    rows={4}
                    placeholder="Ej. Aplicar 2 gotas cada 8 horas por 7 días..."
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100 resize-none disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                  />
                </div>
              </div>

              {!isViewMode && (
                <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                  <Link
                    href="/recetas"
                    className="px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                  >
                    Cancelar
                  </Link>
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
                      "Guardar Cambios"
                    )}
                  </button>
                </div>
              )}
              {isViewMode && (
                <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                  <Link
                    href={`/recetas/${recetaId}`}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-orange-600/20"
                  >
                    Editar Receta
                  </Link>
                </div>
              )}
            </form>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
