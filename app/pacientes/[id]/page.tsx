"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import type { AppUser, Consulta, Mutual, Patient, Receta } from "@/lib/types";
import { isMergedPatient, patientDisplayName } from "@/lib/patient-merge";

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
    obra_social: "",
    mutual_id: "",
    numero_afiliado: "",
    domicilio: "",
    numero_ficha: "",
  });

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record as AppUser | null);

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

        // Luego cargar paciente
        const record = await pb.collection("pacientes").getOne<Patient>(pacienteId, {
          expand: "mutual_id,fusionado_en_paciente_id",
        });
        setPaciente(record);
        
        // Cargar historial de consultas
        try {
          const consultasRecords = await pb.collection("consultas").getFullList<Consulta>({
            filter: `paciente_id = "${pacienteId}"`,
            sort: "-fecha",
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
  const recetasRecientes = recetas.slice(0, 5);
  const edadPaciente = getPatientAge(formData.fecha_nacimiento);
  const antecedentesActivos = getAntecedentesActivos(paciente);

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
                  <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
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
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ClinicalInfoBlock
                  title="Contacto"
                  rows={[
                    ["Telefono", formData.telefono || "-"],
                    ["Email", formData.email || "-"],
                    ["Domicilio", formData.domicilio || "-"],
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
                        {formatDate(ultimaConsulta.fecha)} - {ultimaConsulta.motivo_consulta || "Sin motivo"}{ultimaConsulta.diagnostico ? ` - ${ultimaConsulta.diagnostico}` : ""}
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
                    <button
                      key={receta.id}
                      type="button"
                      onClick={() => router.push(`/recetas/${receta.id}?mode=view`)}
                      className="grid w-full grid-cols-1 gap-2 px-6 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 md:grid-cols-[140px_1fr]"
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDate(receta.fecha)}</span>
                      <span className="min-w-0 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="block truncate">{receta.medicamentos || "Sin medicamentos cargados"}</span>
                        {receta.indicaciones && <span className="block truncate text-xs text-zinc-500 dark:text-zinc-500">{receta.indicaciones}</span>}
                      </span>
                    </button>
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
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Motivo</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Diagnóstico</th>
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
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={consulta.motivo_consulta}>
                            {consulta.motivo_consulta || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={consulta.diagnostico}>
                            {consulta.diagnostico || "-"}
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
    paciente.ant_gota ? "Gota" : "",
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
