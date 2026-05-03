const PB_URL = (process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || "").replace(/\/$/, "");
const PER_PAGE = 5000;
let cachedAdminToken = process.env.POCKETBASE_ADMIN_TOKEN || "";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!PB_URL) {
    return Response.json({ error: "POCKETBASE_URL no configurada" }, { status: 500 });
  }

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

async function getNextFichaNumber() {
  const recentParams = new URLSearchParams({
    page: "1",
    perPage: "200",
    sort: "-created",
    fields: "numero_ficha",
  });
  const recentData = await pb(`/api/collections/pacientes/records?${recentParams}`);
  const recentMax = maxFichaValue(recentData.items || []);

  if (recentMax > 0) {
    return String(recentMax + 1);
  }

  let page = 1;
  let totalPages = 1;
  let max = 0;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
      fields: "numero_ficha",
    });

    const data = await pb(`/api/collections/pacientes/records?${params}`);
    totalPages = data.totalPages || 1;

    for (const item of data.items || []) {
      const value = numericFichaValue(item.numero_ficha);
      if (value > max) {
        max = value;
      }
    }

    page += 1;
  } while (page <= totalPages);

  return String(max + 1);
}

function maxFichaValue(items: Array<{ numero_ficha?: unknown }>) {
  return items.reduce((max, item) => Math.max(max, numericFichaValue(item.numero_ficha)), 0);
}

async function findDuplicateFicha(numeroFicha: string, excludeId: string) {
  const filterParts = [`numero_ficha = "${escapeFilterValue(numeroFicha)}"`];

  if (excludeId) {
    filterParts.push(`id != "${escapeFilterValue(excludeId)}"`);
  }

  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    fields: "id,nombre,apellido,numero_ficha",
    filter: filterParts.join(" && "),
  });

  const data = await pb(`/api/collections/pacientes/records?${params}`);
  const item = data.items?.[0];

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    nombre: item.nombre,
    apellido: item.apellido,
    numero_ficha: item.numero_ficha,
  };
}

async function pb(path: string) {
  const token = await adminToken();
  const headers = new Headers({ "Content-Type": "application/json" });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${PB_URL}${path}`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PocketBase ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function adminToken() {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }

  const identity = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (!identity || !password) {
    return "";
  }

  const body = JSON.stringify({ identity, password });
  let response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    response = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  }

  if (!response.ok) {
    throw new Error(`No se pudo autenticar en PocketBase: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  cachedAdminToken = data.token || "";
  return cachedAdminToken;
}

function numericFichaValue(value: unknown) {
  const matches = String(value || "").match(/\d+/g);
  if (!matches?.length) {
    return 0;
  }

  const parsed = Number(matches[matches.length - 1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFicha(value: string) {
  return value.trim().toUpperCase();
}

function escapeFilterValue(value: string) {
  return value.replace(/"/g, '\\"');
}
