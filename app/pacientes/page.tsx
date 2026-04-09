"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

// Interfaz para el tipo de datos del Paciente
interface Patient {
  id: string;
  nombre: string;
  apellido: string;
  tipo_documento?: string;
  numero_documento: string;
  telefono: string;
  email: string;
  fecha_nacimiento: string;
  obra_social: string;
  numero_afiliado: string;
  domicilio: string;
  created: string;
  numero_ficha?: string;
}

export default function PacientesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Debounce para la búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Resetear página al buscar
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Resetear página al cambiar la letra
  useEffect(() => {
    setPage(1);
  }, [selectedLetter]);

  // Verificar autenticación y cargar datos
  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadPacientes = async () => {
      setIsLoading(true);
      try {
        let filterParts = [];
        
        if (selectedLetter) {
          filterParts.push(`apellido ~ "${selectedLetter}%"`);
        }
        
        if (debouncedSearchQuery) {
          const searchVal = debouncedSearchQuery.toLowerCase().replace(/"/g, '\\"');
          const terms = searchVal.split(/\s+/).filter(term => term.length > 0);
          if (terms.length > 0) {
            const termFilters = terms.map(term => `(nombre ~ "${term}" || apellido ~ "${term}" || numero_documento ~ "${term}")`);
            filterParts.push(`(${termFilters.join(" && ")})`);
          }
        }
        
        const filterString = filterParts.length > 0 ? filterParts.join(" && ") : "";

        const result = await pb.collection("pacientes").getList<Patient>(page, 100, {
          sort: "apellido,nombre",
          filter: filterString,
          requestKey: null,
        });
        setPacientes(result.items);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPacientes();

    // NOTA: Se comenta la suscripción en tiempo real ya que con paginación 
    // y miles de registros, puede causar comportamientos inesperados en la vista.
  }, [router, selectedLetter, debouncedSearchQuery, page]);

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este paciente?")) {
      try {
        await pb.collection("pacientes").delete(id);
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  if (!isMounted) return null; // Evita el error de hidratación

  if (!user) return null; // Previene un flash del contenido antes de redirigir

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-8">
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
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Gestión de Pacientes</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Administra el historial de tus pacientes</p>
            </div>
          </div>
          <Link
            href="/pacientes/nuevo"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/30"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Paciente
          </Link>
        </div>

        {/* Barra del Alfabeto */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedLetter("")}
              className={`px-3 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                selectedLetter === ""
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Todos
            </button>
            {alphabet.map((letter) => (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  selectedLetter === letter
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, documento o ficha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 transition-shadow"
            />
          </div>
        </div>

        {/* Tabla de Pacientes */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Paciente</th>
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Documento</th>
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Contacto</th>
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Obra Social</th>
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Cargando pacientes...
                      </div>
                    </td>
                  </tr>
                ) : pacientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      No se encontraron pacientes.
                    </td>
                  </tr>
                ) : (
                  pacientes.map((paciente, index) => (
                    <tr key={paciente.id || `temp-key-${index}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {paciente.apellido.toUpperCase()}, {paciente.nombre.toUpperCase()}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Nac: {paciente.fecha_nacimiento ? formatDate(paciente.fecha_nacimiento) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                        <div>{paciente.tipo_documento || 'DNI'} {paciente.numero_documento || (paciente as any).dni}</div>
                        {paciente.numero_ficha && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Ficha: {paciente.numero_ficha}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-zinc-600 dark:text-zinc-300">{paciente.telefono}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{paciente.email}</div>
                        {paciente.domicilio && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate max-w-[200px]" title={paciente.domicilio}>
                            <span className="font-medium">Dom:</span> {paciente.domicilio}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-zinc-600 dark:text-zinc-300">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
                            {paciente.obra_social || 'Particular'}
                          </span>
                        </div>
                        {paciente.numero_afiliado && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Nº {paciente.numero_afiliado}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link 
                            href={`/pacientes/${paciente.id}?mode=view`}
                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ver paciente"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <Link 
                            href={`/pacientes/${paciente.id}`}
                            className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="Editar paciente"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button 
                            onClick={() => handleDelete(paciente.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar paciente"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {!isLoading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Página <span className="font-medium text-zinc-900 dark:text-zinc-100">{page}</span> de <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
