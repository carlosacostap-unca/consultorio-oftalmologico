"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { use } from "react";
import { formatDate } from "@/lib/utils";

interface Consulta {
  id: string;
  fecha: string;
  paciente_id: string;
  ref_lejos_od_esf: string;
  ref_lejos_od_cil: string;
  ref_lejos_od_eje: string;
  ref_lejos_oi_esf: string;
  ref_lejos_oi_cil: string;
  ref_lejos_oi_eje: string;
  ref_cerca_od_esf: string;
  ref_cerca_od_cil: string;
  ref_cerca_od_eje: string;
  ref_cerca_oi_esf: string;
  ref_cerca_oi_cil: string;
  ref_cerca_oi_eje: string;
  expand?: {
    paciente_id?: {
      nombre: string;
      apellido: string;
      dni: string;
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
          expand: "paciente_id",
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
  if (!consulta) return <div className="p-8">No se encontró la consulta.</div>;

  const paciente = consulta.expand?.paciente_id;

  return (
    <div className="bg-white text-black min-h-screen p-8 print:p-0">
      <div className="max-w-2xl mx-auto border border-gray-300 p-8 rounded-xl print:border-none print:shadow-none print:w-full">
        {/* Cabecera para impresión */}
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Receta de Anteojos</h1>
        </div>

        <div className="flex justify-between mb-8 text-lg">
          <div>
            <span className="font-bold">Paciente:</span> {paciente?.apellido}, {paciente?.nombre}
          </div>
          <div>
            <span className="font-bold">Fecha:</span> {formatDate(consulta.fecha)}
          </div>
        </div>

        {/* Receta LEJOS */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 underline">LEJOS</h2>
          <table className="w-full text-center border-collapse border border-gray-400 text-lg">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-gray-400 p-2"></th>
                <th className="border border-gray-400 p-2">Esférico</th>
                <th className="border border-gray-400 p-2">Cilíndrico</th>
                <th className="border border-gray-400 p-2">Eje</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-bold text-left px-4">Ojo Derecho</td>
                <td className="border border-gray-400 p-2">{consulta.ref_lejos_od_esf || "---"}</td>
                <td className="border border-gray-400 p-2">{consulta.ref_lejos_od_cil || "---"}</td>
                <td className="border border-gray-400 p-2">{consulta.ref_lejos_od_eje || "---"}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 font-bold text-left px-4">Ojo Izquierdo</td>
                <td className="border border-gray-400 p-2">{consulta.ref_lejos_oi_esf || "---"}</td>
                <td className="border border-gray-400 p-2">{consulta.ref_lejos_oi_cil || "---"}</td>
                <td className="border border-gray-400 p-2">{consulta.ref_lejos_oi_eje || "---"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Receta CERCA */}
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-4 underline">CERCA</h2>
          <table className="w-full text-center border-collapse border border-gray-400 text-lg">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-gray-400 p-2"></th>
                <th className="border border-gray-400 p-2">Esférico</th>
                <th className="border border-gray-400 p-2">Cilíndrico</th>
                <th className="border border-gray-400 p-2">Eje</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-bold text-left px-4">Ojo Derecho</td>
                <td className="border border-gray-400 p-2">{consulta.ref_cerca_od_esf || "---"}</td>
                <td className="border border-gray-400 p-2">{consulta.ref_cerca_od_cil || "---"}</td>
                <td className="border border-gray-400 p-2">{consulta.ref_cerca_od_eje || "---"}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 font-bold text-left px-4">Ojo Izquierdo</td>
                <td className="border border-gray-400 p-2">{consulta.ref_cerca_oi_esf || "---"}</td>
                <td className="border border-gray-400 p-2">{consulta.ref_cerca_oi_cil || "---"}</td>
                <td className="border border-gray-400 p-2">{consulta.ref_cerca_oi_eje || "---"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-20 flex justify-end">
          <div className="text-center">
            <div className="w-64 border-t border-black mb-2"></div>
            <p>Firma y Sello</p>
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-4 print:hidden">
          <button 
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            Imprimir
          </button>
          <button 
            onClick={() => window.close()}
            className="px-6 py-2 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
