import { ACTIVE_PATIENT_FILTER } from "./patient-merge";
import { pbAdmin } from "./pocketbase-admin";

const PER_PAGE = 5000;

interface PocketBaseList<T> {
  items?: T[];
  totalPages?: number;
}

export async function getNextFichaNumber() {
  const recentParams = new URLSearchParams({
    page: "1",
    perPage: "200",
    sort: "-created",
    fields: "numero_ficha",
    filter: ACTIVE_PATIENT_FILTER,
  });
  const recentData = (await pbAdmin(`/api/collections/pacientes/records?${recentParams}`)) as PocketBaseList<{ numero_ficha?: unknown }>;
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
      filter: ACTIVE_PATIENT_FILTER,
    });

    const data = (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<{ numero_ficha?: unknown }>;
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

export async function findDuplicateFicha(numeroFicha: string, excludeId: string) {
  const filterParts = [ACTIVE_PATIENT_FILTER, `numero_ficha = "${escapeFilterValue(numeroFicha)}"`];

  if (excludeId) {
    filterParts.push(`id != "${escapeFilterValue(excludeId)}"`);
  }

  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    fields: "id,nombre,apellido,numero_ficha",
    filter: filterParts.join(" && "),
  });

  const data = (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<{
    id: string;
    nombre?: string;
    apellido?: string;
    numero_ficha?: string;
  }>;
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

function maxFichaValue(items: Array<{ numero_ficha?: unknown }>) {
  return items.reduce((max, item) => Math.max(max, numericFichaValue(item.numero_ficha)), 0);
}

function numericFichaValue(value: unknown) {
  const matches = String(value || "").match(/\d+/g);
  if (!matches?.length) {
    return 0;
  }

  const parsed = Number(matches[matches.length - 1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeFilterValue(value: string) {
  return value.replace(/"/g, '\\"');
}
