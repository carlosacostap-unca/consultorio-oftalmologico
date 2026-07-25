import {
  desktopSyncErrorResponse,
  requireDesktopSyncContext,
  touchDevice,
} from "@/lib/desktop-sync/server-auth";
import { pbAdmin } from "@/lib/pocketbase-admin";

const BOOTSTRAP_ENTITIES = ["users", "mutuales", "pacientes", "consultas", "recetas", "settings"] as const;
type BootstrapEntity = (typeof BOOTSTRAP_ENTITIES)[number];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await requireDesktopSyncContext(request, { requireDevice: true });
    const body = (await request.json()) as Record<string, unknown>;
    const entity = String(body.entity || "") as BootstrapEntity;
    const page = boundedInteger(body.page, 1, 100_000, 1);
    const perPage = boundedInteger(body.perPage, 1, 200, 100);

    if (!BOOTSTRAP_ENTITIES.includes(entity)) {
      return Response.json({ error: "Entidad de bootstrap inválida", code: "invalid_entity" }, { status: 400 });
    }

    const result = entity === "settings" ? await loadSettings() : await loadCollection(entity, page, perPage);
    await touchDevice(context.device!.id);

    return Response.json({ entity, ...result, serverTime: new Date().toISOString(), schemaVersion: 1 });
  } catch (error) {
    return desktopSyncErrorResponse(error);
  }
}

async function loadCollection(entity: Exclude<BootstrapEntity, "settings">, page: number, perPage: number) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage), sort: "id" });

  if (entity === "users") {
    params.set("fields", "id,email,name,role,roles,password_configured,created,updated");
  } else if (entity === "mutuales") {
    params.set("fields", "id,nombre,codigo,direccion,telefono,created,updated");
  } else {
    params.set("filter", "sync_deleted != true");
  }

  const result = await pbAdmin(`/api/collections/${entity}/records?${params}`);
  return {
    page: result.page || page,
    perPage: result.perPage || perPage,
    totalItems: result.totalItems || 0,
    totalPages: result.totalPages || 1,
    items: result.items || [],
  };
}

async function loadSettings() {
  const params = new URLSearchParams({
    page: "1",
    perPage: "20",
    fields: "id,key,value,updated",
    filter: 'key = "consulta_edit_limit_days"',
  });
  const result = await pbAdmin(`/api/collections/system_settings/records?${params}`);
  return { page: 1, perPage: 20, totalItems: result.totalItems || 0, totalPages: 1, items: result.items || [] };
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
