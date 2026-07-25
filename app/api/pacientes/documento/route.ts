import { findDuplicatePatientDocument, normalizePatientDocument } from "@/lib/patient-document-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documento = normalizePatientDocument(searchParams.get("documento") || "");
  const tipoDocumento = (searchParams.get("tipo_documento") || "DNI").trim().toUpperCase();
  const excludeId = searchParams.get("exclude_id") || "";

  try {
    if (!documento) {
      return Response.json({ documento, exists: false, duplicate: null });
    }

    const duplicate = await findDuplicatePatientDocument(documento, excludeId, tipoDocumento);
    return Response.json({
      documento,
      tipo_documento: tipoDocumento,
      exists: Boolean(duplicate),
      duplicate,
    });
  } catch (error) {
    console.error("Error al consultar documento de paciente:", error);
    return Response.json({ error: "No se pudo consultar el documento del paciente" }, { status: 500 });
  }
}
