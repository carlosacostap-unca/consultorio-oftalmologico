"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";
import type { AppUser, Mutual } from "@/lib/types";

type OccupiedMutualCode = {
  code: string;
  mutualName: string;
};

const normalizeMutualCode = (code: string) => code.trim();

export default function NuevaMutualPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCodes, setIsLoadingCodes] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [occupiedCodes, setOccupiedCodes] = useState<OccupiedMutualCode[]>([]);

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    direccion: "",
    telefono: "",
  });

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record as AppUser | null);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadOccupiedCodes = async () => {
      setIsLoadingCodes(true);
      try {
        const records = await pb.collection("mutuales").getFullList<Pick<Mutual, "nombre" | "codigo">>({
          fields: "nombre,codigo",
          sort: "codigo,nombre",
          requestKey: null,
        });

        const codes = records
          .map((mutual) => ({
            code: normalizeMutualCode(mutual.codigo || ""),
            mutualName: mutual.nombre || "Mutual sin nombre",
          }))
          .filter((mutual) => mutual.code)
          .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" }));

        setOccupiedCodes(codes);
      } catch (error) {
        console.error("Error al cargar codigos ocupados de mutuales:", error);
      } finally {
        setIsLoadingCodes(false);
      }
    };

    void loadOccupiedCodes();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const normalizedCode = normalizeMutualCode(formData.codigo);
  const occupiedCode = normalizedCode
    ? occupiedCodes.find((mutual) => mutual.code.toLowerCase() === normalizedCode.toLowerCase())
    : undefined;
  const hasDuplicateCode = Boolean(occupiedCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasDuplicateCode) {
      alert(`El codigo ${normalizedCode} ya esta ocupado por ${occupiedCode?.mutualName}. Elegi otro codigo.`);
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        nombre: formData.nombre.toUpperCase(),
        codigo: normalizedCode,
      };
      await pb.collection("mutuales").create(dataToSave);
      router.push("/mutuales");
    } catch (error) {
      console.error("Error al crear mutual:", error);
      alert("Error al guardar la mutual. Verifica que la colección 'mutuales' exista en PocketBase con los campos correctos (nombre, codigo, direccion, telefono).");
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
            type="button"
            onClick={() => router.back()}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Registrar Nueva Mutual</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Completa los datos de la mutual / obra social</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre *</label>
                <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 uppercase" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Código</label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleInputChange}
                  aria-invalid={hasDuplicateCode}
                  aria-describedby={hasDuplicateCode ? "codigo-duplicado" : undefined}
                  className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border rounded-lg focus:outline-none focus:ring-2 dark:text-zinc-200 ${
                    hasDuplicateCode
                      ? "border-red-400 focus:ring-red-500/50 dark:border-red-500"
                      : "border-zinc-200 dark:border-zinc-800 focus:ring-blue-500/50"
                  }`}
                />
                {hasDuplicateCode && (
                  <p id="codigo-duplicado" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                    El código {normalizedCode} ya está ocupado por {occupiedCode?.mutualName}.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Códigos ocupados</h2>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isLoadingCodes ? "Cargando..." : `${occupiedCodes.length} en uso`}
                  </span>
                </div>
                {isLoadingCodes ? (
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Consultando mutuales existentes...</p>
                ) : occupiedCodes.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No hay códigos ocupados.</p>
                ) : (
                  <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {occupiedCodes.map((mutual) => (
                      <div
                        key={`${mutual.code}-${mutual.mutualName}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <span className="min-w-10 font-semibold text-zinc-900 dark:text-zinc-100">{mutual.code}</span>
                        <span className="truncate text-right text-zinc-600 dark:text-zinc-300">{mutual.mutualName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Dirección</label>
                <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Teléfono</label>
                <input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || hasDuplicateCode}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  "Guardar Mutual"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
