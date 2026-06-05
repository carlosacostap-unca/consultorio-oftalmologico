"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import type { ReactNode } from "react";
import { pb } from "@/lib/pocketbase";
import { formatDate } from "@/lib/utils";
import { doctorLabel } from "@/lib/doctor-attribution";
import { emptyIfOptionalClinicalZero } from "@/lib/clinical-empty-values";

interface PrintablePatient {
  nombre?: string;
  apellido?: string;
  dni?: string;
  numero_documento?: string;
  numero_ficha?: string;
  obra_social?: string;
  numero_afiliado?: string;
  fecha_nacimiento?: string;
}

interface PrintableDoctor {
  name?: string;
  email?: string;
}

interface PrintableConsulta {
  id: string;
  paciente_id: string;
  medico_id?: string;
  fecha?: string;
  motivo_consulta?: string;
  av_sc_od?: string;
  av_sc_oi?: string;
  av_cc_od?: string;
  av_cc_oi?: string;
  ref_lejos_od_esf?: string;
  ref_lejos_od_cil?: string;
  ref_lejos_od_eje?: string;
  ref_lejos_oi_esf?: string;
  ref_lejos_oi_cil?: string;
  ref_lejos_oi_eje?: string;
  add_value?: string;
  ref_cerca_od_esf?: string;
  ref_cerca_od_cil?: string;
  ref_cerca_od_eje?: string;
  ref_cerca_oi_esf?: string;
  ref_cerca_oi_cil?: string;
  ref_cerca_oi_eje?: string;
  pio_od?: string;
  pio_oi?: string;
  biomicroscopia?: string;
  fondo_ojo?: string;
  diagnostico?: string;
  tratamiento?: string;
  ant_alergico?: boolean;
  ant_asmatico?: boolean;
  ant_reuma?: boolean;
  ant_herpes?: boolean;
  ant_diabetes?: boolean;
  ant_glaucoma?: boolean;
  ant_maculopatia?: boolean;
  ant_hipertension?: boolean;
  ant_otra?: string;
  expand?: {
    paciente_id?: PrintablePatient;
    medico_id?: PrintableDoctor;
  };
}

interface PrintableReceta {
  id: string;
  fecha?: string;
  medicamentos?: string;
  indicaciones?: string;
}

export default function ImprimirConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [consulta, setConsulta] = useState<PrintableConsulta | null>(null);
  const [recetas, setRecetas] = useState<PrintableReceta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [consultaRecord, recetasRecords] = await Promise.all([
          pb.collection("consultas").getOne<PrintableConsulta>(resolvedParams.id, {
            expand: "paciente_id,medico_id",
          }),
          pb.collection("recetas").getFullList<PrintableReceta>({
            filter: `consulta_id = "${resolvedParams.id}"`,
            sort: "-fecha,-created",
          }),
        ]);
        setConsulta(consultaRecord);
        setRecetas(recetasRecords);
      } catch (error) {
        console.error("Error al cargar el informe clinico", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [resolvedParams.id]);

  if (isLoading) return <div className="p-8">Cargando informe clinico para imprimir...</div>;
  if (!consulta) return <div className="p-8">No se encontro la consulta.</div>;

  const paciente = consulta.expand?.paciente_id;
  const pacienteNombre = paciente ? `${paciente.apellido || ""}, ${paciente.nombre || ""}`.replace(/^,\s*/, "").trim() : "Paciente";
  const documento = paciente?.numero_documento || paciente?.dni || "";
  const antecedentes = activeAntecedentes(consulta);

  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-0">
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-300 p-8 print:w-full print:border-none print:p-8">
        <header className="border-b-2 border-gray-900 pb-5 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Informe clinico de consulta</h1>
          <p className="mt-2 text-sm text-gray-600">Consultorio oftalmologico</p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Paciente" value={pacienteNombre} />
          <Info label="Fecha" value={consulta.fecha ? formatDate(consulta.fecha) : "-"} />
          <Info label="Medico" value={doctorLabel(consulta.expand?.medico_id)} />
          <Info label="Documento" value={documento || "-"} />
          <Info label="Ficha" value={paciente?.numero_ficha || "-"} />
          <Info label="Obra social" value={paciente?.obra_social || "-"} />
          <Info label="Afiliado" value={paciente?.numero_afiliado || "-"} />
        </section>

        <Section title="Motivo de consulta">
          <TextBlock value={consulta.motivo_consulta} />
        </Section>

        <Section title="Antecedentes activos">
          {antecedentes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {antecedentes.map((item) => (
                <span key={item} className="rounded-full border border-gray-300 px-3 py-1 text-sm font-semibold">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <TextBlock value="Sin antecedentes activos" />
          )}
        </Section>

        <Section title="Examen oftalmologico">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Table
              title="Agudeza visual"
              headers={["", "OD", "OI"]}
              rows={[
                ["Sin correccion", displayOptional("av_sc_od", consulta.av_sc_od), displayOptional("av_sc_oi", consulta.av_sc_oi)],
                ["Con correccion", displayOptional("av_cc_od", consulta.av_cc_od), displayOptional("av_cc_oi", consulta.av_cc_oi)],
              ]}
            />
            <Table
              title="Presion ocular"
              headers={["", "OD", "OI"]}
              rows={[["PIO", displayOptional("pio_od", consulta.pio_od), displayOptional("pio_oi", consulta.pio_oi)]]}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextBlock label="Biomicroscopia" value={consulta.biomicroscopia} />
            <TextBlock label="Fondo de ojo" value={consulta.fondo_ojo} />
          </div>
        </Section>

        <Section title="Refraccion">
          {(() => {
            const addValue = displayOptional("add_value", consulta.add_value);
            return (
          <Table
            title={addValue !== "-" ? `ADD ${addValue}` : ""}
            headers={["", "Esferico", "Cilindrico", "Eje"]}
            rows={[
              ["Lejos OD", displayOptional("ref_lejos_od_esf", consulta.ref_lejos_od_esf), displayOptional("ref_lejos_od_cil", consulta.ref_lejos_od_cil), displayOptional("ref_lejos_od_eje", consulta.ref_lejos_od_eje)],
              ["Lejos OI", displayOptional("ref_lejos_oi_esf", consulta.ref_lejos_oi_esf), displayOptional("ref_lejos_oi_cil", consulta.ref_lejos_oi_cil), displayOptional("ref_lejos_oi_eje", consulta.ref_lejos_oi_eje)],
              ["Cerca OD", displayOptional("ref_cerca_od_esf", consulta.ref_cerca_od_esf), displayOptional("ref_cerca_od_cil", consulta.ref_cerca_od_cil), displayOptional("ref_cerca_od_eje", consulta.ref_cerca_od_eje)],
              ["Cerca OI", displayOptional("ref_cerca_oi_esf", consulta.ref_cerca_oi_esf), displayOptional("ref_cerca_oi_cil", consulta.ref_cerca_oi_cil), displayOptional("ref_cerca_oi_eje", consulta.ref_cerca_oi_eje)],
            ]}
          />
            );
          })()}
        </Section>

        <Section title="Diagnostico y tratamiento">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextBlock label="Diagnostico" value={consulta.diagnostico} />
            <TextBlock label="Tratamiento" value={consulta.tratamiento} />
          </div>
        </Section>

        <Section title="Recetas asociadas">
          {recetas.length > 0 ? (
            <div className="space-y-3">
              {recetas.map((receta) => (
                <div key={receta.id} className="rounded-lg border border-gray-300 p-4">
                  <div className="mb-2 text-sm font-bold">{receta.fecha ? formatDate(receta.fecha) : "Sin fecha"}</div>
                  <TextBlock label="Medicamentos" value={receta.medicamentos} />
                  <div className="mt-3">
                    <TextBlock label="Indicaciones" value={receta.indicaciones} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <TextBlock value="No hay recetas asociadas a esta consulta." />
          )}
        </Section>

        <div className="mt-16 flex justify-end">
          <div className="text-center">
            <div className="mb-2 w-64 border-t border-black"></div>
            <p>Firma y sello</p>
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-4 print:hidden">
          <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700">
            Imprimir
          </button>
          <button onClick={() => window.close()} className="rounded-lg bg-gray-300 px-6 py-2 font-bold text-black hover:bg-gray-400">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 border-b border-gray-300 pb-2 text-lg font-bold uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-bold">{label}:</span> {value || "-"}
    </div>
  );
}

function TextBlock({ label, value }: { label?: string; value?: string }) {
  return (
    <div>
      {label && <div className="mb-1 text-sm font-bold">{label}</div>}
      <div className="min-h-10 whitespace-pre-wrap rounded-lg border border-gray-300 p-3 text-sm leading-relaxed">
        {display(value)}
      </div>
    </div>
  );
}

function Table({ title, headers, rows }: { title?: string; headers: string[]; rows: string[][] }) {
  return (
    <div>
      {title && <div className="mb-2 text-sm font-bold">{title}</div>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((header) => (
              <th key={header} className="border border-gray-400 p-2 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>
              {row.map((cell, index) => (
                <td key={`${row[0]}-${index}`} className="border border-gray-400 p-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function display(value?: string) {
  return String(value || "").trim() || "-";
}

function displayOptional(field: string, value?: string) {
  return String(emptyIfOptionalClinicalZero(field, value) || "").trim() || "-";
}

function activeAntecedentes(consulta: PrintableConsulta) {
  return [
    consulta.ant_diabetes ? "Diabetes" : "",
    consulta.ant_glaucoma ? "Glaucoma" : "",
    consulta.ant_maculopatia ? "Maculopatia" : "",
    consulta.ant_asmatico ? "Asma" : "",
    consulta.ant_hipertension ? "Hipertension" : "",
    consulta.ant_alergico ? "Alergia" : "",
    consulta.ant_reuma ? "Reuma" : "",
    consulta.ant_herpes ? "Herpes" : "",
    consulta.ant_otra?.trim() || "",
  ].filter(Boolean);
}
