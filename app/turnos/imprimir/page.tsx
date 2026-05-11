"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { formatDate } from "@/lib/utils";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
  numero_documento?: string;
  telefono?: string;
  obra_social?: string;
}

interface Medico {
  id: string;
  name?: string;
  email?: string;
}

interface Turno {
  id: string;
  paciente_id: string;
  medico_id?: string;
  fecha_hora: string;
  motivo?: string;
  observaciones?: string;
  estado?: string;
  tipo?: string;
  es_sobreturno?: boolean;
  expand?: {
    paciente_id?: Paciente;
    medico_id?: Medico;
  };
}

const DEFAULT_FIELDS = ["hora", "paciente", "dni", "telefono", "obra_social", "tipo", "motivo", "estado", "observaciones"];

function ImprimirTurnosInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateParam = searchParams.get("date");
  const fieldsParam = searchParams.get("fields");
  const medicoParam = searchParams.get("medico_id") || "all";
  const shouldAutoPrint = searchParams.get("autoprint") !== "0";

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fields = fieldsParam ? fieldsParam.split(",").filter(Boolean) : DEFAULT_FIELDS;
  const hasField = (field: string) => fields.includes(field);
  const isAllDoctors = medicoParam === "all" || !medicoParam;

  const doctorLabel = (doctor?: Medico | null) => {
    if (!doctor) return "Sin medico asignado";
    return doctor.name || doctor.email || "Medico";
  };

  const doctorById = (id?: string) => medicos.find((medico) => medico.id === id) || null;
  const patientDocument = (patient?: Paciente | null) => patient?.dni || patient?.numero_documento || "-";

  const groups = useMemo(() => {
    if (!isAllDoctors) {
      return [{
        key: medicoParam,
        title: doctorLabel(turnos[0]?.expand?.medico_id || doctorById(medicoParam)),
        items: turnos,
      }];
    }

    const map = new Map<string, { title: string; items: Turno[] }>();
    for (const turno of turnos) {
      const key = turno.medico_id || "sin-medico";
      const current = map.get(key) || { title: doctorLabel(turno.expand?.medico_id || doctorById(turno.medico_id)), items: [] };
      current.items.push(turno);
      map.set(key, current);
    }

    return Array.from(map.entries()).map(([key, group]) => ({
      key,
      title: group.title,
      items: group.items.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()),
    }));
  }, [isAllDoctors, medicoParam, medicos, turnos]);

  useEffect(() => {
    if (!dateParam) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const startOfDay = new Date(`${dateParam}T00:00:00`).toISOString().replace("T", " ");
        const endOfDay = new Date(`${dateParam}T23:59:59`).toISOString().replace("T", " ");
        const doctorFilter = isAllDoctors ? "" : ` && medico_id = "${medicoParam.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

        const [records, medicosResponse] = await Promise.all([
          pb.collection("turnos").getFullList<Turno>({
            filter: `fecha_hora >= "${startOfDay}" && fecha_hora <= "${endOfDay}"${doctorFilter}`,
            sort: "medico_id,fecha_hora",
            expand: "paciente_id,medico_id",
            requestKey: null,
          }),
          fetch("/api/medicos", {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          }),
        ]);

        if (medicosResponse.ok) {
          const medicosData = await medicosResponse.json();
          setMedicos(Array.isArray(medicosData.medicos) ? medicosData.medicos : []);
        }
        setTurnos(records);
      } catch (error) {
        console.error("Error al cargar los turnos", error);
        setLoadError("No se pudieron cargar los turnos para imprimir.");
      } finally {
        setIsLoading(false);
        if (shouldAutoPrint) {
          setTimeout(() => {
            window.print();
          }, 500);
        }
      }
    };

    loadData();
  }, [dateParam, isAllDoctors, medicoParam, shouldAutoPrint]);

  if (isLoading) return <div className="p-8">Cargando datos para imprimir...</div>;
  if (!dateParam) return <div className="p-8">No se especifico una fecha.</div>;

  const dateLabel = formatDate(new Date(`${dateParam}T12:00:00`).toISOString()).split(",")[0];
  const scopeLabel = isAllDoctors ? "Todos los medicos" : doctorLabel(turnos[0]?.expand?.medico_id || doctorById(medicoParam));

  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-0">
      <div className="mx-auto max-w-6xl rounded-xl border border-gray-300 p-8 print:w-full print:max-w-full print:border-none print:p-0">
        <div className="mb-6 border-b-2 border-gray-800 pb-4">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-widest">Listado diario de turnos</h1>
              <p className="mt-1 text-sm text-gray-600">Fecha: {dateLabel}</p>
              <p className="text-sm text-gray-600">Alcance: {scopeLabel}</p>
            </div>
            <div className="text-right text-sm font-semibold">
              <div>Total: {turnos.length}</div>
              {isAllDoctors && <div>Medicos con turnos: {groups.length}</div>}
            </div>
          </div>
        </div>

        {loadError ? (
          <p className="py-8 text-center text-red-700">{loadError}</p>
        ) : turnos.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No hay turnos registrados para esta fecha y medico.</p>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key} className="break-inside-avoid">
                {isAllDoctors && (
                  <div className="mb-2 flex items-center justify-between border-b border-gray-300 pb-1">
                    <h2 className="text-lg font-bold">{group.title}</h2>
                    <span className="text-xs font-semibold text-gray-600">{group.items.length} turnos</span>
                  </div>
                )}
                <table className="w-full border-collapse border border-gray-400 text-left text-xs">
                  <thead>
                    <tr className="bg-gray-100 print:bg-gray-100">
                      {hasField("hora") && <th className="w-16 border border-gray-400 p-2 font-bold">Hora</th>}
                      {hasField("paciente") && <th className="border border-gray-400 p-2 font-bold">Paciente</th>}
                      {hasField("dni") && <th className="w-24 border border-gray-400 p-2 font-bold">DNI</th>}
                      {hasField("telefono") && <th className="w-28 border border-gray-400 p-2 font-bold">Telefono</th>}
                      {hasField("obra_social") && <th className="border border-gray-400 p-2 font-bold">Obra social</th>}
                      {hasField("tipo") && <th className="w-24 border border-gray-400 p-2 font-bold">Tipo</th>}
                      {hasField("motivo") && <th className="border border-gray-400 p-2 font-bold">Motivo</th>}
                      {hasField("estado") && <th className="w-24 border border-gray-400 p-2 font-bold">Estado</th>}
                      {hasField("observaciones") && <th className="border border-gray-400 p-2 font-bold">Observaciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((turno) => {
                      const dateObj = new Date(turno.fecha_hora);
                      const timeString = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const paciente = turno.expand?.paciente_id;

                      return (
                        <tr key={turno.id} className={turno.es_sobreturno ? "bg-orange-50 print:bg-transparent" : ""}>
                          {hasField("hora") && (
                            <td className="border border-gray-400 p-2 font-medium">
                              {timeString}
                              {turno.es_sobreturno && <div className="text-[10px] font-bold leading-tight text-gray-600">SOBRETURNO</div>}
                            </td>
                          )}
                          {hasField("paciente") && (
                            <td className="border border-gray-400 p-2 font-semibold">
                              {paciente ? `${paciente.apellido.toUpperCase()}, ${paciente.nombre}` : "Sin paciente"}
                            </td>
                          )}
                          {hasField("dni") && <td className="border border-gray-400 p-2">{patientDocument(paciente)}</td>}
                          {hasField("telefono") && <td className="border border-gray-400 p-2">{paciente?.telefono || "-"}</td>}
                          {hasField("obra_social") && <td className="border border-gray-400 p-2">{paciente?.obra_social || "-"}</td>}
                          {hasField("tipo") && <td className="border border-gray-400 p-2">{turno.tipo || "-"}</td>}
                          {hasField("motivo") && <td className="border border-gray-400 p-2">{turno.motivo || "-"}</td>}
                          {hasField("estado") && <td className="border border-gray-400 p-2 italic">{turno.estado || "Sin asignar"}</td>}
                          {hasField("observaciones") && <td className="border border-gray-400 p-2">{turno.observaciones || ""}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}

        <div className="mt-8 text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="mr-4 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Imprimir de nuevo
          </button>
          <button
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                router.push("/turnos");
              }
            }}
            className="rounded-lg bg-gray-200 px-6 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-300"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ImprimirTurnosPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando datos para imprimir...</div>}>
      <ImprimirTurnosInner />
    </Suspense>
  );
}
