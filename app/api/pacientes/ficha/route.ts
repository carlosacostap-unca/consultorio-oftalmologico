import { findDuplicateFicha, getNextFichaNumber } from "@/lib/patient-ficha-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numeroFicha = normalizeFicha(searchParams.get("numero_ficha") || "");
  const excludeId = searchParams.get("exclude_id") || "";

  try {
    if (numeroFicha) {
      const duplicate = await findDuplicateFicha(numeroFicha, excludeId);
      return Response.json({
        numero_ficha: numeroFicha,
        exists: Boolean(duplicate),
        duplicate,
      });
    }

    const next = await getNextFichaNumber();
    return Response.json({ next });
  } catch (error) {
    console.error("Error al consultar numero de ficha:", error);
    return Response.json({ error: "No se pudo consultar el numero de ficha" }, { status: 500 });
  }
}

function normalizeFicha(value: string) {
  return value.trim().toUpperCase();
}
