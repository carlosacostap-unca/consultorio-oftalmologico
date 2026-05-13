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
  numero_afiliado?: string;
}

interface PrintableConsulta {
  id: string;
  fecha?: string;
  motivo_consulta?: string;
  diagnostico?: string;
  tratamiento?: string;
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
  const hasClinicalContext = Boolean(consulta?.motivo_consulta || consulta?.diagnostico || consulta?.tratamiento);

  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-0">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-300 p-8 print:w-full print:border-none print:p-8">
        <header className="border-b-2 border-gray-900 pb-5 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Receta medica</h1>
          <p className="mt-2 text-sm text-gray-600">Consultorio oftalmologico</p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Paciente" value={pacienteNombre} />
          <Info label="Fecha" value={receta.fecha ? formatDate(receta.fecha) : "-"} />
          <Info label="Documento" value={documento || "-"} />
          <Info label="Ficha" value={paciente?.numero_ficha || "-"} />
          <Info label="Obra social" value={paciente?.obra_social || "-"} />
          <Info label="Afiliado" value={paciente?.numero_afiliado || "-"} />
        </section>

        {consulta && (
          <section className="mt-6 rounded-lg border border-gray-300 p-4 text-sm">
            <h2 className="mb-3 text-base font-bold uppercase">Consulta vinculada</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="Fecha de consulta" value={consulta.fecha ? formatDate(consulta.fecha) : consulta.id} />
              <Info label="Identificador" value={consulta.id} />
            </div>
            {hasClinicalContext && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h3 className="mb-3 text-sm font-bold uppercase">Contexto clinico</h3>
                <div className="grid grid-cols-1 gap-3">
                  <Info label="Motivo" value={consulta.motivo_consulta || "-"} />
                  <Info label="Diagnostico" value={consulta.diagnostico || "-"} />
                  <Info label="Tratamiento" value={consulta.tratamiento || "-"} />
                </div>
              </div>
            )}
          </section>
        )}

        <div className="mt-10">
          <h2 className="mb-3 border-b border-gray-300 pb-2 text-lg font-bold uppercase">Medicamentos</h2>
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

        <div className="mt-10 flex flex-wrap justify-center gap-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700"
          >
            Imprimir
          </button>
          <button
            onClick={() => {
              window.location.href = `/recetas/${receta.id}?mode=view`;
            }}
            className="rounded-lg bg-gray-900 px-6 py-2 font-bold text-white hover:bg-gray-800"
          >
            Volver a receta
          </button>
          {consulta && (
            <button
              onClick={() => {
                window.location.href = `/consultas/${consulta.id}`;
              }}
              className="rounded-lg border border-gray-400 bg-white px-6 py-2 font-bold text-black hover:bg-gray-100"
            >
              Volver a consulta
            </button>
          )}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-bold">{label}:</span> {value || "-"}
    </div>
  );
}
