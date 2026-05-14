"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Receta } from "@/lib/types";
import { doctorLabel } from "@/lib/doctor-attribution";
import { patientDocument } from "@/lib/patient-merge";

type RelationFilter = "all" | "linked" | "free";

export default function RecetasPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterQuery, setFilterQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterRelation, setFilterRelation] = useState<RelationFilter>("all");

  useEffect(() => {
    setIsMounted(true);

    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const recetasRecords = await pb.collection("recetas").getFullList<Receta>({
          sort: "-fecha",
          expand: "paciente_id,consulta_id,medico_id",
        });
        setRecetas(recetasRecords);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    let unsubscribe: () => void;
    pb.collection("recetas")
      .subscribe<Receta>("*", async () => {
        const records = await pb.collection("recetas").getFullList<Receta>({
          sort: "-fecha",
          expand: "paciente_id,consulta_id,medico_id",
        });
        setRecetas(records);
      })
      .then((unsub) => { unsubscribe = unsub; })
      .catch((err) => console.log("Suscripcion fallida a recetas:", err));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Estas seguro de que deseas eliminar esta receta?")) {
      try {
        await pb.collection("recetas").delete(id);
      } catch (error) {
        console.error("Error al eliminar receta:", error);
      }
    }
  };

  const patientName = (receta: Receta) => {
    const paciente = receta.expand?.paciente_id;
    if (!paciente) return "Paciente no encontrado";
    return `${paciente.apellido || ""}, ${paciente.nombre || ""}`.replace(/^,\s*/, "").trim() || "Paciente";
  };

  const recetaDate = (receta: Receta) => {
    if (!receta.fecha) return "";
    return receta.fecha.includes("T") ? receta.fecha.split("T")[0] : receta.fecha.split(" ")[0];
  };

  const filteredRecetas = recetas.filter((receta) => {
    let matchesQuery = true;
    let matchesDate = true;
    let matchesRelation = true;

    if (filterQuery) {
      const paciente = receta.expand?.paciente_id;
      const searchable = [
        paciente?.nombre,
        paciente?.apellido,
        patientDocument(paciente),
        paciente?.numero_ficha,
        receta.medicamentos,
        receta.indicaciones,
      ].filter(Boolean).join(" ").toLowerCase();
      matchesQuery = searchable.includes(filterQuery.toLowerCase());
    }

    if (filterDate) {
      matchesDate = recetaDate(receta) === filterDate;
    }

    if (filterRelation === "linked") {
      matchesRelation = Boolean(receta.consulta_id);
    } else if (filterRelation === "free") {
      matchesRelation = !receta.consulta_id;
    }

    return matchesQuery && matchesDate && matchesRelation;
  });

  const hasActiveFilters = Boolean(filterQuery || filterDate || filterRelation !== "all");

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="p-2 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Recetas</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gestion de recetas medicas</p>
            </div>
          </div>
          
          <Link
            href="/recetas/nueva"
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-orange-600/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva receta
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.45fr)_minmax(190px,0.45fr)_auto]">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Paciente, documento, ficha, medicamento o indicacion..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Filtrar por fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Vinculacion</label>
            <select
              value={filterRelation}
              onChange={(event) => setFilterRelation(event.target.value as RelationFilter)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-zinc-100"
            >
              <option value="all">Todas</option>
              <option value="linked">Con consulta</option>
              <option value="free">Recetas libres</option>
            </select>
          </div>
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterQuery("");
                  setFilterDate("");
                  setFilterRelation("all");
                }}
                className="w-full whitespace-nowrap px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredRecetas.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No hay recetas</h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              {recetas.length === 0 ? "Aun no has registrado ninguna receta medica." : "No se encontraron recetas con los filtros aplicados."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterQuery("");
                  setFilterDate("");
                  setFilterRelation("all");
                }}
                className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Paciente</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Medico</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Medicamentos</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Consulta</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredRecetas.map((receta) => (
                    <tr key={receta.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                        {receta.fecha ? formatDate(receta.fecha) : "Sin fecha"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {patientName(receta)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          DNI: {patientDocument(receta.expand?.paciente_id) || "-"}
                          {receta.expand?.paciente_id?.numero_ficha ? ` - Ficha ${receta.expand.paciente_id.numero_ficha}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-200">
                        {doctorLabel(receta.expand?.medico_id)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-sm text-zinc-700 dark:text-zinc-200">
                          {receta.medicamentos || "Sin especificar"}
                        </div>
                        {receta.indicaciones && (
                          <div className="mt-1 max-w-xs truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {receta.indicaciones}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {receta.consulta_id ? (
                          <div>
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Con consulta
                            </span>
                            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {receta.expand?.consulta_id?.fecha ? formatDate(receta.expand.consulta_id.fecha) : "Consulta vinculada"}
                            </div>
                            {receta.expand?.consulta_id?.diagnostico && (
                              <div className="mt-1 max-w-48 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {receta.expand.consulta_id.diagnostico}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            Receta libre
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/recetas/${receta.id}?mode=view`}
                            aria-label={`Ver receta de ${patientName(receta)}`}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                            title="Ver"
                          >
                            Ver
                          </Link>
                          <Link
                            href={`/recetas/${receta.id}/imprimir`}
                            aria-label={`Imprimir receta de ${patientName(receta)}`}
                            className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
                            title="Imprimir"
                          >
                            Imprimir
                          </Link>
                          <Link
                            href={`/recetas/${receta.id}`}
                            aria-label={`Editar receta de ${patientName(receta)}`}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                            title="Editar"
                          >
                            Editar
                          </Link>
                          {receta.paciente_id && (
                            <Link
                              href={`/pacientes/${receta.paciente_id}?mode=view`}
                              aria-label={`Ver paciente de ${patientName(receta)}`}
                              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                              title="Ver paciente"
                            >
                              Paciente
                            </Link>
                          )}
                          {receta.consulta_id && (
                            <Link
                              href={`/consultas/${receta.consulta_id}`}
                              aria-label={`Volver a consulta de ${patientName(receta)}`}
                              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                              title="Volver a consulta"
                            >
                              Consulta
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(receta.id)}
                            aria-label={`Eliminar receta de ${patientName(receta)}`}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/30"
                            title="Eliminar"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
