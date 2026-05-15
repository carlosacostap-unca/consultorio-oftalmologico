"use client";

import { useEffect, useState, use } from "react";
import { pb } from "@/lib/pocketbase";
import type { Consulta, Patient, Receta } from "@/lib/types";
import { patientDisplayName, patientDocument } from "@/lib/patient-merge";
import { doctorLabel } from "@/lib/doctor-attribution";

type PrintableConsulta = Consulta & {
  tratamiento?: string;
};

export default function ImprimirFichaPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: pacienteId } = use(params);
  const [paciente, setPaciente] = useState<Patient | null>(null);
  const [consultas, setConsultas] = useState<PrintableConsulta[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pacienteRecord, consultasRecords, recetasRecords] = await Promise.all([
          pb.collection("pacientes").getOne<Patient>(pacienteId, {
            expand: "mutual_id",
          }),
          pb.collection("consultas").getFullList<PrintableConsulta>({
            filter: `paciente_id = "${pacienteId}"`,
            sort: "-fecha",
            expand: "medico_id",
          }),
          pb.collection("recetas").getFullList<Receta>({
            filter: `paciente_id = "${pacienteId}"`,
            sort: "-fecha,-created",
            expand: "consulta_id,medico_id",
          }),
        ]);

        setPaciente(pacienteRecord);
        setConsultas(consultasRecords);
        setRecetas(recetasRecords);
      } catch (error) {
        console.error("Error al cargar ficha clinica imprimible:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pacienteId]);

  if (isLoading) return <div className="p-8">Cargando ficha clinica...</div>;
  if (!paciente) return <div className="p-8">No se encontro el paciente.</div>;

  const antecedentes = getAntecedentesActivos(paciente);
  const cobertura = paciente.expand?.mutual_id?.nombre || paciente.obra_social || "-";
  const documento = patientDocument(paciente);
  const consultasRecientes = consultas.slice(0, 5);
  const recetasRecientes = recetas.slice(0, 5);

  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-0">
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-300 p-8 print:w-full print:border-none print:p-8">
        <header className="border-b-2 border-gray-900 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-widest">Ficha clinica del paciente</h1>
              <p className="mt-2 text-sm text-gray-600">Consultorio oftalmologico</p>
            </div>
            <div className="text-sm text-gray-700 sm:text-right">
              <div>Emitida: {formatDate(new Date().toISOString())}</div>
              <div>Consultas: {consultas.length}</div>
              <div>Recetas: {recetas.length}</div>
            </div>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold uppercase">Paciente</h2>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Info label="Nombre" value={patientDisplayName(paciente)} />
            <Info label="Documento" value={documento ? `${paciente.tipo_documento || "DNI"} ${documento}` : "-"} />
            <Info label="Ficha" value={paciente.numero_ficha || "-"} />
            <Info label="Fecha de nacimiento" value={formatDate(paciente.fecha_nacimiento)} />
            <Info label="Telefono" value={paciente.telefono || "-"} />
            <Info label="Email" value={paciente.email || "-"} />
            <Info label="Domicilio" value={paciente.domicilio || "-"} />
            <Info label="Obra social" value={cobertura} />
            <Info label="Afiliado" value={paciente.numero_afiliado || "-"} />
          </div>
        </section>

        <section className="mt-7 rounded-lg border border-gray-300 p-4">
          <h2 className="mb-3 text-base font-bold uppercase">Antecedentes activos</h2>
          {antecedentes.length === 0 ? (
            <p className="text-sm text-gray-600">Sin antecedentes activos registrados.</p>
          ) : (
            <div className="flex flex-wrap gap-2 text-sm">
              {antecedentes.map((antecedente) => (
                <span key={antecedente} className="rounded-full border border-gray-300 px-3 py-1 font-semibold">
                  {antecedente}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 border-b border-gray-300 pb-2 text-lg font-bold uppercase">Ultimas consultas</h2>
          {consultasRecientes.length === 0 ? (
            <p className="text-sm text-gray-600">No hay consultas registradas.</p>
          ) : (
            <div className="space-y-3">
              {consultasRecientes.map((consulta) => (
                <article key={consulta.id} className="rounded-lg border border-gray-300 p-4 text-sm break-inside-avoid">
                  <div className="mb-2 font-bold">{formatDate(consulta.fecha)}</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Info label="Medico" value={doctorLabel(consulta.expand?.medico_id)} />
                    <Info label="Motivo" value={consulta.motivo_consulta || "-"} />
                    <Info label="Diagnostico" value={consulta.diagnostico || "-"} />
                    <Info label="Tratamiento" value={consulta.tratamiento || "-"} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 border-b border-gray-300 pb-2 text-lg font-bold uppercase">Recetas recientes</h2>
          {recetasRecientes.length === 0 ? (
            <p className="text-sm text-gray-600">No hay recetas registradas.</p>
          ) : (
            <div className="space-y-3">
              {recetasRecientes.map((receta) => (
                <article key={receta.id} className="rounded-lg border border-gray-300 p-4 text-sm break-inside-avoid">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-bold">{formatDate(receta.fecha)}</span>
                    <span>{receta.consulta_id ? "Vinculada a consulta" : "Receta libre"}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Info label="Medico" value={doctorLabel(receta.expand?.medico_id)} />
                    <Info label="Medicamentos" value={receta.medicamentos || "-"} />
                    <Info label="Indicaciones" value={receta.indicaciones || "-"} />
                    {receta.expand?.consulta_id?.fecha && (
                      <Info label="Fecha de consulta" value={formatDate(receta.expand.consulta_id.fecha)} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-gray-300 pt-4 text-xs text-gray-600">
          Documento generado desde el sistema del consultorio para seguimiento clinico interno.
        </footer>

        <div className="mt-10 flex flex-wrap justify-center gap-4 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = `/pacientes/${pacienteId}?mode=view`;
            }}
            className="rounded-lg bg-gray-900 px-6 py-2 font-bold text-white hover:bg-gray-800"
          >
            Volver a ficha
          </button>
          <button
            type="button"
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

function getAntecedentesActivos(paciente: Patient) {
  return [
    paciente.ant_diabetes ? "Diabetes" : "",
    paciente.ant_glaucoma ? "Glaucoma" : "",
    paciente.ant_maculopatia ? "Maculopatia" : "",
    paciente.ant_asmatico ? "Asmatico" : "",
    paciente.ant_hipertension ? "Hipertension" : "",
    paciente.ant_alergico ? "Alergico" : "",
    paciente.ant_reuma ? "Reuma" : "",
    paciente.ant_herpes ? "Herpes" : "",
    paciente.ant_otra?.trim() || "",
  ].filter(Boolean);
}

function formatDate(value?: string) {
  if (!value) return "-";

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-");
      return `${day}/${month}/${year}`;
    }

    return new Date(value).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  } catch {
    return "-";
  }
}
