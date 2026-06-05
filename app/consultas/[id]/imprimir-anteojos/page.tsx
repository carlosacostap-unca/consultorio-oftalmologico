"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { pb } from "@/lib/pocketbase";
import { formatDate } from "@/lib/utils";
import { doctorLabel } from "@/lib/doctor-attribution";
import { emptyIfOptionalClinicalZero } from "@/lib/clinical-empty-values";

interface Consulta {
  id: string;
  fecha: string;
  paciente_id: string;
  medico_id?: string;
  add_value?: string;
  diagnostico?: string;
  tratamiento?: string;
  ref_lejos_od_esf?: string;
  ref_lejos_od_cil?: string;
  ref_lejos_od_eje?: string;
  ref_lejos_oi_esf?: string;
  ref_lejos_oi_cil?: string;
  ref_lejos_oi_eje?: string;
  ref_cerca_od_esf?: string;
  ref_cerca_od_cil?: string;
  ref_cerca_od_eje?: string;
  ref_cerca_oi_esf?: string;
  ref_cerca_oi_cil?: string;
  ref_cerca_oi_eje?: string;
  expand?: {
    paciente_id?: {
      nombre?: string;
      apellido?: string;
      dni?: string;
      numero_documento?: string;
      numero_ficha?: string;
      obra_social?: string;
      numero_afiliado?: string;
    };
    medico_id?: {
      name?: string;
      email?: string;
    };
  };
}

export default function ImprimirAnteojosPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const record = await pb.collection("consultas").getOne<Consulta>(resolvedParams.id, {
          expand: "paciente_id,medico_id",
        });
        setConsulta(record);
      } catch (error) {
        console.error("Error al cargar la consulta", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [resolvedParams.id]);

  if (isLoading) return <div className="p-8">Cargando datos para imprimir...</div>;
  if (!consulta) return <div className="p-8">No se encontro la consulta.</div>;

  const paciente = consulta.expand?.paciente_id;
  const pacienteNombre = paciente ? `${paciente.apellido || ""}, ${paciente.nombre || ""}`.replace(/^,\s*/, "").trim() : "Paciente";
  const documento = paciente?.numero_documento || paciente?.dni || "";

  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-0">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-300 p-8 print:w-full print:border-none print:p-8">
        <header className="border-b-2 border-gray-900 pb-5 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Receta de anteojos</h1>
          <p className="mt-2 text-sm text-gray-600">Consultorio oftalmologico</p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Paciente" value={pacienteNombre} />
          <Info label="Fecha" value={formatDate(consulta.fecha)} />
          <Info label="Medico" value={doctorLabel(consulta.expand?.medico_id)} />
          <Info label="Documento" value={documento || "-"} />
          <Info label="Ficha" value={paciente?.numero_ficha || "-"} />
          <Info label="Obra social" value={paciente?.obra_social || "-"} />
          <Info label="Afiliado" value={paciente?.numero_afiliado || "-"} />
        </section>

        {(consulta.diagnostico || consulta.tratamiento || displayOptional("add_value", consulta.add_value) !== "---") && (
          <section className="mt-6 rounded-lg border border-gray-300 p-4 text-sm">
            <h2 className="mb-3 text-base font-bold uppercase">Contexto clinico</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Info label="Diagnostico" value={consulta.diagnostico || "-"} />
              <Info label="Tratamiento" value={consulta.tratamiento || "-"} />
              <Info label="ADD" value={displayOptional("add_value", consulta.add_value)} />
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 border-b border-gray-300 pb-2 text-lg font-bold uppercase">Lejos</h2>
          <RefractionTable
            rows={[
              ["Ojo derecho", consulta.ref_lejos_od_esf, consulta.ref_lejos_od_cil, consulta.ref_lejos_od_eje, "ref_lejos_od"],
              ["Ojo izquierdo", consulta.ref_lejos_oi_esf, consulta.ref_lejos_oi_cil, consulta.ref_lejos_oi_eje, "ref_lejos_oi"],
            ]}
          />
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-300 pb-2">
            <h2 className="text-lg font-bold uppercase">Cerca</h2>
            {displayOptional("add_value", consulta.add_value) !== "---" && <span className="text-sm font-bold">ADD {displayOptional("add_value", consulta.add_value)}</span>}
          </div>
          <RefractionTable
            rows={[
              ["Ojo derecho", consulta.ref_cerca_od_esf, consulta.ref_cerca_od_cil, consulta.ref_cerca_od_eje, "ref_cerca_od"],
              ["Ojo izquierdo", consulta.ref_cerca_oi_esf, consulta.ref_cerca_oi_cil, consulta.ref_cerca_oi_eje, "ref_cerca_oi"],
            ]}
          />
        </section>

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
            onClick={() => {
              window.location.href = `/consultas/${consulta.id}?mode=view`;
            }}
            className="rounded-lg bg-gray-900 px-6 py-2 font-bold text-white hover:bg-gray-800"
          >
            Volver a consulta
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-bold">{label}:</span> {value || "-"}
    </div>
  );
}

function RefractionTable({ rows }: { rows: Array<[string, string | undefined, string | undefined, string | undefined, string]> }) {
  return (
    <table className="w-full border-collapse text-base">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-400 p-2 text-left">Ojo</th>
          <th className="border border-gray-400 p-2">Esferico</th>
          <th className="border border-gray-400 p-2">Cilindrico</th>
          <th className="border border-gray-400 p-2">Eje</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, esf, cil, eje, fieldPrefix]) => (
          <tr key={label}>
            <td className="border border-gray-400 p-2 font-bold">{label}</td>
            <td className="border border-gray-400 p-2 text-center">{displayOptional(`${fieldPrefix}_esf`, esf)}</td>
            <td className="border border-gray-400 p-2 text-center">{displayOptional(`${fieldPrefix}_cil`, cil)}</td>
            <td className="border border-gray-400 p-2 text-center">{displayOptional(`${fieldPrefix}_eje`, eje)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function displayOptional(field: string, value?: string) {
  return String(emptyIfOptionalClinicalZero(field, value) || "").trim() || "---";
}
