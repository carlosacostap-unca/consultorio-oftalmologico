"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";
import type { AppUser, Mutual } from "@/lib/types";

export default function NuevoPacientePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNextFicha, setIsLoadingNextFicha] = useState(true);
  const [isCreatingMutual, setIsCreatingMutual] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mutuales, setMutuales] = useState<Mutual[]>([]);
  const [mutualSearchQuery, setMutualSearchQuery] = useState("");
  const [showMutualDropdown, setShowMutualDropdown] = useState(false);
  const [showNewMutualForm, setShowNewMutualForm] = useState(false);
  const [newMutualData, setNewMutualData] = useState({
    nombre: "",
    codigo: "",
    direccion: "",
    telefono: "",
  });

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    tipo_documento: "DNI",
    numero_documento: "",
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

    const loadMutuales = async () => {
      try {
        const records = await pb.collection("mutuales").getFullList<Mutual>({
          sort: "nombre",
        });
        setMutuales(records);
      } catch (error) {
        console.error("Error al cargar mutuales:", error);
      }
    };

    const loadNextFicha = async () => {
      setIsLoadingNextFicha(true);
      try {
        const response = await fetch("/api/pacientes/ficha");
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        if (data.next) {
          setFormData((prev) => (prev.numero_ficha ? prev : { ...prev, numero_ficha: data.next }));
        }
      } catch (error) {
        console.error("Error al cargar el siguiente numero de ficha:", error);
      } finally {
        setIsLoadingNextFicha(false);
      }
    };

    loadMutuales();
    loadNextFicha();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewMutualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewMutualData((prev) => ({ ...prev, [name]: value }));
  };

  const validateNumeroFicha = async () => {
    const numeroFicha = formData.numero_ficha.trim().toUpperCase();
    if (!numeroFicha) {
      return true;
    }

    const params = new URLSearchParams({ numero_ficha: numeroFicha });
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

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const filteredMutuales = mutuales
    .filter((mutual) => {
      const query = normalizeText(mutualSearchQuery);
      if (!query) return true;
      return normalizeText(mutual.nombre || "").includes(query) || normalizeText(mutual.codigo || "").includes(query);
    })
    .slice(0, 30);

  const hasExactMutualMatch = mutuales.some((mutual) => normalizeText(mutual.nombre || "") === normalizeText(mutualSearchQuery));

  const selectMutual = (mutual: Mutual) => {
    setFormData((prev) => ({ ...prev, mutual_id: mutual.id, obra_social: mutual.nombre }));
    setMutualSearchQuery(mutual.codigo ? `${mutual.nombre} (${mutual.codigo})` : mutual.nombre);
    setShowMutualDropdown(false);
    setShowNewMutualForm(false);
  };

  const handleCreateMutual = async () => {
    const nombre = newMutualData.nombre.trim() || mutualSearchQuery.trim();
    if (!nombre) {
      alert("Ingresá el nombre de la obra social.");
      return;
    }

    setIsCreatingMutual(true);
    try {
      const record = await pb.collection("mutuales").create<Mutual>({
        ...newMutualData,
        nombre: nombre.toUpperCase(),
      });
      setMutuales((prev) => [...prev, record].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      selectMutual(record);
      setNewMutualData({ nombre: "", codigo: "", direccion: "", telefono: "" });
    } catch (error) {
      console.error("Error al crear mutual:", error);
      alert("Error al guardar la obra social.");
    } finally {
      setIsCreatingMutual(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        tipo_documento: "DNI",
        nombre: formData.nombre.toUpperCase(),
        apellido: formData.apellido.toUpperCase(),
        obra_social: selectedMutual?.nombre || "",
        numero_ficha: formData.numero_ficha.toUpperCase()
      };
      const paciente = await pb.collection("pacientes").create(dataToSave);
      router.push(`/consultas/nueva?paciente_id=${paciente.id}`);
    } catch (error) {
      console.error("Error al crear paciente:", error);
      alert("Error al guardar el paciente. Verifica que la colección 'pacientes' exista en PocketBase.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Registrar Nuevo Paciente</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Completa los datos del paciente</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Datos Personales</h3>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Apellido *</label>
                  <input required type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 uppercase" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre *</label>
                  <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Número de Documento *</label>
                  <input required type="text" name="numero_documento" value={formData.numero_documento} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Número de Ficha</label>
                  <input type="text" name="numero_ficha" value={formData.numero_ficha} onChange={handleInputChange} className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 uppercase ${isLoadingNextFicha ? "animate-pulse" : ""}`} placeholder={isLoadingNextFicha ? "Calculando siguiente ficha..." : "Ej: A-123"} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha de Nacimiento</label>
                  <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 dark:[color-scheme:dark]" />
                </div>
              </div>

              {/* Contacto y Cobertura */}
              <div className="space-y-4">
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Contacto y Cobertura</h3>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Teléfono</label>
                  <input type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Domicilio</label>
                  <input type="text" name="domicilio" value={formData.domicilio} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Obra Social / Prepaga</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={mutualSearchQuery}
                      onChange={(event) => {
                        setMutualSearchQuery(event.target.value);
                        setShowMutualDropdown(true);
                        setShowNewMutualForm(false);
                        if (formData.mutual_id) {
                          setFormData((prev) => ({ ...prev, mutual_id: "", obra_social: "" }));
                        }
                      }}
                      onFocus={() => setShowMutualDropdown(true)}
                      onBlur={() => setTimeout(() => setShowMutualDropdown(false), 200)}
                      placeholder="Buscar obra social o prepaga..."
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                    />
                    {showMutualDropdown && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="max-h-56 overflow-y-auto">
                          {filteredMutuales.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                              No se encontraron obras sociales.
                            </div>
                          ) : (
                            filteredMutuales.map((mutual) => (
                              <button
                                key={mutual.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectMutual(mutual)}
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{mutual.nombre}</span>
                                {mutual.codigo && <span className="text-zinc-500 dark:text-zinc-400"> ({mutual.codigo})</span>}
                              </button>
                            ))
                          )}
                        </div>
                        {mutualSearchQuery.trim() && !hasExactMutualMatch && (
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setNewMutualData((prev) => ({ ...prev, nombre: mutualSearchQuery.toUpperCase() }));
                              setShowMutualDropdown(false);
                              setShowNewMutualForm(true);
                            }}
                            className="w-full border-t border-zinc-200 px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-zinc-800 dark:text-blue-300 dark:hover:bg-blue-500/10"
                          >
                            Registrar "{mutualSearchQuery.toUpperCase()}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {showNewMutualForm && (
                    <div className="mt-3 space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Nombre *</label>
                        <input type="text" name="nombre" value={newMutualData.nombre} onChange={handleNewMutualInputChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 uppercase" />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Código</label>
                          <input type="text" name="codigo" value={newMutualData.codigo} onChange={handleNewMutualInputChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Teléfono</label>
                          <input type="text" name="telefono" value={newMutualData.telefono} onChange={handleNewMutualInputChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Dirección</label>
                        <input type="text" name="direccion" value={newMutualData.direccion} onChange={handleNewMutualInputChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowNewMutualForm(false)} className="px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg">
                          Cancelar
                        </button>
                        <button type="button" disabled={isCreatingMutual} onClick={handleCreateMutual} className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg">
                          {isCreatingMutual ? "Guardando..." : "Guardar obra social"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nº de Afiliado</label>
                  <input type="text" name="numero_afiliado" value={formData.numero_afiliado} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? "Guardando..." : "Guardar Paciente"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

