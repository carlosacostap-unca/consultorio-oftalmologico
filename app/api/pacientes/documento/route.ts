import { findDuplicatePatientDocument, normalizePatientDocument } from "@/lib/patient-document-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documento = normalizePatientDocument(searchParams.get("documento") || "");
  const excludeId = searchParams.get("exclude_id") || "";

  try {
    if (!documento) {
      return Response.json({ documento, exists: false, duplicate: null });
    }

    const duplicate = await findDuplicatePatientDocument(documento, excludeId);
    return Response.json({
      documento,
      exists: Boolean(duplicate),
      duplicate,
    });
  } catch (error) {
    console.error("Error al consultar documento de paciente:", error);
    return Response.json({ error: "No se pudo consultar el documento del paciente" }, { status: 500 });
  }
}
