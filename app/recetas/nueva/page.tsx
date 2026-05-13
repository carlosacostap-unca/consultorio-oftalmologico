"use client";

import { useState, useEffect, Suspense } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Consulta, Patient } from "@/lib/types";
import { buildActivePatientSearchFilter } from "@/lib/patient-merge";

interface SavedPrescription {
  id: string;
  pacienteId: string;
  consultaId: string;
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
  
  const [isMounted, setIsMounted] = useState(false);
  
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPacienteData, setSelectedPacienteData] = useState<Patient | null>(null);
  const [selectedConsultaData, setSelectedConsultaData] = useState<Consulta | null>(null);
  const [savedPrescription, setSavedPrescription] = useState<SavedPrescription | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [debouncedPatientSearchQuery, setDebouncedPatientSearchQuery] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  
  const initialConsultaId = searchParams.get('consulta_id') || "";
  const initialPacienteId = searchParams.get('paciente_id') || "";

  const [formData, setFormData] = useState({
    paciente_id: initialPacienteId,
    consulta_id: initialConsultaId,
    fecha: new Date().toISOString().split('T')[0],
    medicamentos: "",
    indicaciones: "",
  });

  const patientDocument = (patient?: Patient | null) => patient?.numero_documento || patient?.dni || "";
  const patientLabel = (patient?: Patient | null) => {
    if (!patient) return "Paciente seleccionado";
    const document = patientDocument(patient);
    return `${patient.apellido}, ${patient.nombre}${document ? ` - DNI ${document}` : ""}`;
  };
  const displayValue = (value?: string | null) => {
    const normalized = String(value ?? "").trim();
    return normalized || "-";
  };
  const formatPatientOption = (patient: Patient) => {
    const document = patientDocument(patient);
    return `${patient.apellido}, ${patient.nombre}${document ? ` - DNI: ${document}` : ""}${patient.numero_ficha ? ` - Ficha: ${patient.numero_ficha}` : ""}`;
  };
  const upsertPatient = (patient: Patient) => {
    setPacientes((prev) => [patient, ...prev.filter((item) => item.id !== patient.id)]);
  };
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

    const loadInitialContext = async () => {
      try {
        if (formData.paciente_id) {
          const paciente = await pb.collection("pacientes").getOne<Patient>(formData.paciente_id);
          setSelectedPacienteData(paciente);
          setPatientSearchQuery(formatPatientOption(paciente));
          upsertPatient(paciente);
        }
      } catch (error) {
        console.error("Error al cargar paciente de la receta:", error);
      }
    };

    loadInitialContext();
  }, [router]);

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid) {
      return;
    }

    const loadConsultas = async () => {
      if (!formData.paciente_id) {
        setConsultas([]);
        setSelectedConsultaData(null);
        return;
      }

      try {
        const consultasRecords = await pb.collection("consultas").getFullList<Consulta>({
          filter: `paciente_id = "${formData.paciente_id}"`,
          sort: "-fecha",
        });
        setConsultas(consultasRecords);
        setSelectedConsultaData(consultasRecords.find((consulta) => consulta.id === formData.consulta_id) || null);
      } catch (error) {
        console.error("Error al cargar consultas del paciente:", error);
        setConsultas([]);
        setSelectedConsultaData(null);
      }
    };

    loadConsultas();
  }, [isMounted, formData.paciente_id, formData.consulta_id]);

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid || formData.paciente_id) {
      return;
    }

    const loadPatientResults = async () => {
      setIsSearchingPatients(true);
      try {
        const result = await pb.collection("pacientes").getList<Patient>(1, 20, {
          sort: "apellido,nombre",
          filter: buildActivePatientSearchFilter(debouncedPatientSearchQuery),
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
  }, [isMounted, formData.paciente_id, debouncedPatientSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savedPrescription) return;
    if (!formData.paciente_id) {
      alert("Selecciona un paciente de la lista.");
      return;
    }

    setIsLoading(true);

    try {
      const fechaConHora = `${formData.fecha} 12:00:00.000Z`;

      const nuevaReceta = await pb.collection("recetas").create({
        paciente_id: formData.paciente_id,
        consulta_id: formData.consulta_id || null, // Opcional
        fecha: fechaConHora,
        medicamentos: formData.medicamentos,
        indicaciones: formData.indicaciones,
      });

      setSavedPrescription({
        id: nuevaReceta.id,
        pacienteId: formData.paciente_id,
        consultaId: formData.consulta_id,
      });
    } catch (error) {
      console.error("Error al guardar la receta:", error);
      alert(error instanceof Error ? error.message : "Error al guardar la receta");
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
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Completa los datos para generar una nueva receta</p>
          </div>
        </div>

        {(selectedPacienteData || selectedConsultaData || savedPrescription) && (
          <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {savedPrescription ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Receta guardada correctamente</p>
                  <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{patientLabel(selectedPacienteData)}</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    La receta quedo asociada {savedPrescription.consultaId ? "a la consulta seleccionada." : "al paciente seleccionado."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/recetas/${savedPrescription.id}?mode=view`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                    Ver receta
                  </Link>
                  <Link href={`/recetas/${savedPrescription.id}/imprimir`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                    Imprimir receta
                  </Link>
                  {savedPrescription.consultaId && (
                    <Link href={`/consultas/${savedPrescription.consultaId}`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      Volver a consulta
                    </Link>
                  )}
                  {savedPrescription.consultaId && (
                    <Link href={`/consultas/${savedPrescription.consultaId}/imprimir-anteojos`} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      Imprimir anteojos
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSavedPrescription(null);
                      setFormData((prev) => ({ ...prev, medicamentos: "", indicaciones: "" }));
                    }}
                    className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white hover:bg-orange-700"
                  >
                    Nueva receta
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Contexto de receta</p>
                  <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{patientLabel(selectedPacienteData)}</h2>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                      <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Consulta</div>
                      <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{selectedConsultaData?.fecha ? formatDate(selectedConsultaData.fecha) : "Sin consulta vinculada"}</div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                      <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Diagnostico</div>
                      <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayValue(selectedConsultaData?.diagnostico)}</div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                      <div className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Tratamiento</div>
                      <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayValue((selectedConsultaData as Consulta & { tratamiento?: string })?.tratamiento)}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Receta de anteojos</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {formData.consulta_id ? "Disponible desde la consulta vinculada." : "Vincula una consulta para imprimir anteojos."}
                  </p>
                  {formData.consulta_id && (
                    <Link href={`/consultas/${formData.consulta_id}/imprimir-anteojos`} className="mt-3 inline-flex rounded-lg bg-[#2d8f8f] px-3 py-2 text-sm font-bold text-white hover:bg-[#1f6b6b]">
                      Imprimir anteojos
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

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
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => {
                        setPatientSearchQuery(e.target.value);
                        setShowPatientDropdown(true);
                        if (formData.paciente_id) {
                          setFormData({ ...formData, paciente_id: "", consulta_id: "" });
                          setSelectedPacienteData(null);
                          setSavedPrescription(null);
                        }
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                      placeholder="Buscar por apellido, nombre, documento o ficha"
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100"
                    />
                    {showPatientDropdown && !formData.paciente_id && (
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
                              setSavedPrescription(null);
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
                    Fecha de receta *
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
                    Consulta relacionada (opcional)
                  </label>
                  <div className="flex gap-2">
                      <select
                        value={formData.consulta_id}
                        onChange={(e) => {
                          setFormData({ ...formData, consulta_id: e.target.value });
                          setSavedPrescription(null);
                        }}
                        className="flex-grow px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100"
                      >
                      <option value="">Ninguna o crear sin consulta</option>
                      {consultas.map((consulta) => (
                        <option key={consulta.id} value={consulta.id}>
                          {formatDate(consulta.fecha)} - {consulta.diagnostico ? consulta.diagnostico.substring(0, 50) + "..." : "Sin diagnostico"}
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
                        Imprimir anteojos
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
                  value={formData.medicamentos}
                  onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                  rows={4}
                  placeholder="Ej. Lentes de contacto, gotas oftalmicas..."
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
                  placeholder="Ej. Aplicar 2 gotas cada 8 horas por 7 dias..."
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
                disabled={isLoading || Boolean(savedPrescription)}
                className="px-6 py-2.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-orange-600/20"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : savedPrescription ? (
                  "Receta guardada"
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
