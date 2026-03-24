"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { formatDate } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  obra_social: string;
}

interface Turno {
  id: string;
  paciente_id: string;
  fecha_hora: string;
  motivo: string;
  observaciones?: string;
  estado?: string;
  tipo?: string;
  es_sobreturno?: boolean;
  expand?: {
    paciente_id: Paciente;
  };
}

function ImprimirTurnosInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateParam = searchParams.get("date");
  const fieldsParam = searchParams.get("fields");

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default fields if none specified
  const fields = fieldsParam 
    ? fieldsParam.split(",") 
    : ["hora", "paciente", "dni", "motivo", "estado"];

  const hasField = (field: string) => fields.includes(field);

  useEffect(() => {
    if (!dateParam) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const startOfDay = new Date(`${dateParam}T00:00:00`).toISOString();
        const endOfDay = new Date(`${dateParam}T23:59:59`).toISOString();

        const records = await pb.collection("turnos").getFullList<Turno>({
          filter: `fecha_hora >= "${startOfDay}" && fecha_hora <= "${endOfDay}"`,
          sort: "fecha_hora",
          expand: "paciente_id",
        });
        setTurnos(records);
      } catch (error) {
        console.error("Error al cargar los turnos", error);
      } finally {
        setIsLoading(false);
        // Pequeño delay para asegurar que renderizó antes de lanzar el diálogo de impresión
        setTimeout(() => {
          window.print();
        }, 500);
      }
    };

    loadData();
  }, [dateParam]);

  if (isLoading) return <div className="p-8">Cargando datos para imprimir...</div>;
  if (!dateParam) return <div className="p-8">No se especificó una fecha.</div>;

  return (
    <div className="bg-white text-black min-h-screen p-8 print:p-0">
      <div className="max-w-4xl mx-auto border border-gray-300 p-8 rounded-xl print:border-none print:shadow-none print:w-full print:max-w-full">
        {/* Cabecera */}
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-800 flex justify-between items-end">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-left">Listado de Turnos</h1>
          <div className="text-lg font-semibold">
            Fecha: {formatDate(new Date(`${dateParam}T12:00:00`).toISOString()).split(',')[0]}
          </div>
        </div>

        {turnos.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay turnos registrados para esta fecha.</p>
        ) : (
          <table className="w-full text-left border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                {hasField('hora') && <th className="border border-gray-400 p-2 font-bold w-16">Hora</th>}
                {hasField('paciente') && <th className="border border-gray-400 p-2 font-bold">Paciente</th>}
                {hasField('dni') && <th className="border border-gray-400 p-2 font-bold w-24">DNI</th>}
                {hasField('telefono') && <th className="border border-gray-400 p-2 font-bold w-28">Teléfono</th>}
                {hasField('obra_social') && <th className="border border-gray-400 p-2 font-bold">Obra Social</th>}
                {hasField('tipo') && <th className="border border-gray-400 p-2 font-bold w-24">Tipo</th>}
                {hasField('motivo') && <th className="border border-gray-400 p-2 font-bold">Motivo</th>}
                {hasField('estado') && <th className="border border-gray-400 p-2 font-bold w-24">Estado</th>}
                {hasField('observaciones') && <th className="border border-gray-400 p-2 font-bold">Observaciones</th>}
              </tr>
            </thead>
            <tbody>
              {turnos.map((turno) => {
                const dateObj = new Date(turno.fecha_hora);
                const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const paciente = turno.expand?.paciente_id;
                
                return (
                  <tr key={turno.id} className={turno.es_sobreturno ? "bg-orange-50 print:bg-transparent" : ""}>
                    {hasField('hora') && (
                      <td className="border border-gray-400 p-2 font-medium">
                        {timeString}
                        {turno.es_sobreturno && <div className="text-[10px] text-orange-600 print:text-gray-600 leading-tight font-bold">SOBRETURNO</div>}
                      </td>
                    )}
                    {hasField('paciente') && (
                      <td className="border border-gray-400 p-2 font-semibold">
                        {paciente ? `${paciente.apellido.toUpperCase()}, ${paciente.nombre}` : 'Sin paciente'}
                      </td>
                    )}
                    {hasField('dni') && (
                      <td className="border border-gray-400 p-2 text-xs">
                        {paciente?.dni || '-'}
                      </td>
                    )}
                    {hasField('telefono') && (
                      <td className="border border-gray-400 p-2 text-xs">
                        {paciente?.telefono || '-'}
                      </td>
                    )}
                    {hasField('obra_social') && (
                      <td className="border border-gray-400 p-2 text-xs">
                        {paciente?.obra_social || '-'}
                      </td>
                    )}
                    {hasField('tipo') && (
                      <td className="border border-gray-400 p-2 text-xs">
                        {turno.tipo || '-'}
                      </td>
                    )}
                    {hasField('motivo') && (
                      <td className="border border-gray-400 p-2 text-xs">
                        {turno.motivo || '-'}
                      </td>
                    )}
                    {hasField('estado') && (
                      <td className="border border-gray-400 p-2 text-xs italic">
                        {turno.estado || 'Sin asignar'}
                      </td>
                    )}
                    {hasField('observaciones') && (
                      <td className="border border-gray-400 p-2 text-xs">
                        {turno.observaciones || ''}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="mt-8 text-center print:hidden">
          <button 
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors mr-4"
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
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
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
