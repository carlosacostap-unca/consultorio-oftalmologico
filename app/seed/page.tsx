"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SeedPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!pb.authStore.isValid) {
      router.push("/");
    }
  }, [router]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const generateData = async () => {
    setIsLoading(true);
    setLogs([]);
    try {
      addLog("Iniciando generación de datos sintéticos...");

      const mockPacientes = [
        { nombre: "Juan", apellido: "Pérez", dni: "30123456", telefono: "1122334455", email: "juan.perez@email.com", fecha_nacimiento: "1980-05-15T00:00:00.000Z", obra_social: "OSDE", numero_afiliado: "12345678" },
        { nombre: "María", apellido: "Gómez", dni: "28654321", telefono: "1198765432", email: "maria.gomez@email.com", fecha_nacimiento: "1975-10-22T00:00:00.000Z", obra_social: "Swiss Medical", numero_afiliado: "87654321" },
        { nombre: "Carlos", apellido: "López", dni: "35987654", telefono: "1155667788", email: "carlos.lopez@email.com", fecha_nacimiento: "1990-03-10T00:00:00.000Z", obra_social: "Galeno", numero_afiliado: "55667788" },
        { nombre: "Ana", apellido: "Martínez", dni: "40123987", telefono: "1133445566", email: "ana.martinez@email.com", fecha_nacimiento: "1998-07-08T00:00:00.000Z", obra_social: "PAMI", numero_afiliado: "33445566" },
        { nombre: "Luis", apellido: "Fernández", dni: "22345678", telefono: "1144556677", email: "luis.fernandez@email.com", fecha_nacimiento: "1965-12-01T00:00:00.000Z", obra_social: "Particular", numero_afiliado: "" },
        // Nuevos pacientes para generar el doble de datos
        { nombre: "Laura", apellido: "Díaz", dni: "31456789", telefono: "1166778899", email: "laura.diaz@email.com", fecha_nacimiento: "1982-11-30T00:00:00.000Z", obra_social: "OSDE", numero_afiliado: "45678912" },
        { nombre: "Diego", apellido: "Ruiz", dni: "29876543", telefono: "1177889900", email: "diego.ruiz@email.com", fecha_nacimiento: "1978-04-14T00:00:00.000Z", obra_social: "Sancor Salud", numero_afiliado: "98765432" },
        { nombre: "Sofía", apellido: "Herrera", dni: "38123456", telefono: "1188990011", email: "sofia.herrera@email.com", fecha_nacimiento: "1995-09-25T00:00:00.000Z", obra_social: "Galeno", numero_afiliado: "12398745" },
        { nombre: "Martín", apellido: "Giménez", dni: "26543210", telefono: "1199001122", email: "martin.gimenez@email.com", fecha_nacimiento: "1972-01-18T00:00:00.000Z", obra_social: "Medifé", numero_afiliado: "65432109" },
        { nombre: "Lucía", apellido: "Rojas", dni: "33456789", telefono: "1100112233", email: "lucia.rojas@email.com", fecha_nacimiento: "1988-08-05T00:00:00.000Z", obra_social: "Particular", numero_afiliado: "" }
      ];

      for (const p of mockPacientes) {
        addLog(`Creando paciente: ${p.nombre} ${p.apellido}...`);
        const pacienteRecord = await pb.collection("pacientes").create(p);

        // Crear 2 Turnos Pendientes (Futuro) por paciente
        for (let i = 0; i < 2; i++) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
          futureDate.setHours(9 + Math.floor(Math.random() * 8), (Math.random() > 0.5 ? 30 : 0), 0, 0);

          addLog(`  -> Creando turno pendiente #${i+1} para ${p.nombre}...`);
          await pb.collection("turnos").create({
            paciente_id: pacienteRecord.id,
            fecha_hora: futureDate.toISOString(),
            motivo: i === 0 ? "Control anual de rutina" : "Seguimiento de tratamiento",
            estado: "pendiente"
          });
        }

        // Crear 2 Turnos Completados (Pasado) & Consultas por paciente
        for (let i = 0; i < 2; i++) {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 90) - 1);
          pastDate.setHours(9 + Math.floor(Math.random() * 8), (Math.random() > 0.5 ? 30 : 0), 0, 0);

          addLog(`  -> Creando turno histórico #${i+1} y consulta para ${p.nombre}...`);
          const pastTurno = await pb.collection("turnos").create({
            paciente_id: pacienteRecord.id,
            fecha_hora: pastDate.toISOString(),
            motivo: i === 0 ? "Renovación de anteojos por dificultad visual" : "Molestia y ardor ocular",
            estado: "completado" // Inicialmente completado
          });

          const consulta = await pb.collection("consultas").create({
            paciente_id: pacienteRecord.id,
            fecha: pastDate.toISOString(),
            motivo_consulta: pastTurno.motivo,
            av_sc_od: "8", av_sc_oi: "8",
            av_cc_od: "10", av_cc_oi: "10",
            ref_lejos_od_esf: "-1.00", ref_lejos_od_cil: "-0.50", ref_lejos_od_eje: "180",
            ref_lejos_oi_esf: "-1.25", ref_lejos_oi_cil: "-0.25", ref_lejos_oi_eje: "175",
            ref_cerca_od_esf: "", ref_cerca_od_cil: "", ref_cerca_od_eje: "",
            ref_cerca_oi_esf: "", ref_cerca_oi_cil: "", ref_cerca_oi_eje: "",
            pio_od: "14", pio_oi: "15",
            fondo_ojo: "Normal, papila de bordes netos, mácula conservada.",
            diagnostico: i === 0 ? "Miopía leve y astigmatismo miópico." : "Síndrome de ojo seco leve.",
            tratamiento: i === 0 ? "Se receta nueva corrección óptica para lejos." : "Lágrimas artificiales cada 6 horas.",
            ant_alergico: false, ant_asmatico: false, ant_reuma: false, ant_gota: false, ant_herpes: false, ant_diabetes: false
          });

          // Enlazar la consulta al turno explícitamente y asegurar el estado
          await pb.collection("turnos").update(pastTurno.id, {
            consulta_id: consulta.id,
            estado: "completado"
          });

          // Crear receta vinculada a la consulta
          addLog(`  -> Creando receta para la consulta de ${p.nombre}...`);
          await pb.collection("recetas").create({
            paciente_id: pacienteRecord.id,
            consulta_id: consulta.id,
            fecha: pastDate.toISOString(),
            medicamentos: i === 0 ? "Lentes aéreos (según receta de refracción)" : "Lágrimas artificiales (Hialuronato de sodio 0.4%)",
            indicaciones: i === 0 ? "Uso permanente para visión lejana." : "Aplicar 1 gota en ambos ojos cada 6 horas o según necesidad."
          });
        }
      }

      addLog("¡Generación de datos completada con éxito!");
    } catch (error: any) {
      console.error(error);
      addLog(`ERROR: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Generar Datos de Demo</h1>
          <Link href="/" className="text-blue-600 hover:underline text-sm font-medium">
            Volver al Inicio
          </Link>
        </div>
        
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Esta herramienta creará 10 pacientes sintéticos, cada uno con 2 turnos pendientes y 2 turnos completados con su respectiva consulta médica y recetas asociadas. Ideal para realizar una demostración del sistema.
        </p>

        <button
          onClick={generateData}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mb-6"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando datos...
            </>
          ) : (
            'Generar Datos Sintéticos'
          )}
        </button>

        {logs.length > 0 && (
          <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-lg font-mono text-xs text-zinc-800 dark:text-zinc-300 max-h-64 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className={`mb-1 ${log.startsWith('ERROR') ? 'text-red-500' : ''}`}>
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
