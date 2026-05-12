"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { pb } from "@/lib/pocketbase";
import { formatDate } from "@/lib/utils";

interface PrintablePatient {
  nombre?: string;
  apellido?: string;
  dni?: string;
  numero_documento?: string;
  numero_ficha?: string;
  obra_social?: string;
}

interface PrintableConsulta {
  id: string;
  fecha?: string;
  diagnostico?: string;
}

interface PrintableReceta {
  id: string;
  paciente_id: string;
  consulta_id?: string;
  fecha?: string;
  medicamentos?: string;
  indicaciones?: string;
  expand?: {
    paciente_id?: PrintablePatient;
    consulta_id?: PrintableConsulta;
  };
}

export default function ImprimirRecetaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [receta, setReceta] = useState<PrintableReceta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const record = await pb.collection("recetas").getOne<PrintableReceta>(resolvedParams.id, {
          expand: "paciente_id,consulta_id",
        });
        setReceta(record);
      } catch (error) {
        console.error("Error al cargar la receta", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [resolvedParams.id]);

  if (isLoading) return <div className="p-8">Cargando receta para imprimir...</div>;
  if (!receta) return <div className="p-8">No se encontro la receta.</div>;

  const paciente = receta.expand?.paciente_id;
  const consulta = receta.expand?.consulta_id;
  const pacienteNombre = paciente ? `${paciente.apellido || ""}, ${paciente.nombre || ""}`.replace(/^,\s*/, "").trim() : "Paciente";
  const documento = paciente?.numero_documento || paciente?.dni || "";

  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-0">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-300 p-8 print:w-full print:border-none print:p-8">
        <div className="border-b-2 border-gray-900 pb-4 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Receta medica</h1>
          <p className="mt-2 text-sm text-gray-600">Consultorio oftalmologico</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 text-base sm:grid-cols-2">
          <div>
            <span className="font-bold">Paciente:</span> {pacienteNombre}
          </div>
          <div>
            <span className="font-bold">Fecha:</span> {receta.fecha ? formatDate(receta.fecha) : "-"}
          </div>
          <div>
            <span className="font-bold">Documento:</span> {documento || "-"}
          </div>
          <div>
            <span className="font-bold">Ficha:</span> {paciente?.numero_ficha || "-"}
          </div>
          {consulta && (
            <div className="sm:col-span-2">
              <span className="font-bold">Consulta relacionada:</span> {consulta.fecha ? formatDate(consulta.fecha) : consulta.id}
              {consulta.diagnostico ? ` - ${consulta.diagnostico}` : ""}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-bold uppercase">Medicamentos / indicacion</h2>
          <div className="min-h-32 whitespace-pre-wrap rounded-lg border border-gray-300 p-4 text-lg leading-relaxed">
            {receta.medicamentos || "-"}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold uppercase">Indicaciones</h2>
          <div className="min-h-24 whitespace-pre-wrap rounded-lg border border-gray-300 p-4 text-base leading-relaxed">
            {receta.indicaciones || "-"}
          </div>
        </div>

        <div className="mt-20 flex justify-end">
          <div className="text-center">
            <div className="mb-2 w-64 border-t border-black"></div>
            <p>Firma y sello</p>
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700"
          >
            Imprimir
          </button>
          <button
            onClick={() => window.close()}
            className="rounded-lg bg-gray-300 px-6 py-2 font-bold text-black hover:bg-gray-400"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
