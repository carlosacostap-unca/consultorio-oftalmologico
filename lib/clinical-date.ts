const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const CLINICAL_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function todayClinicalDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINICAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : dateKeyFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function clinicalDateKey(value: string | Date | undefined | null) {
  if (!value) return "";

  if (typeof value === "string") {
    const match = value.match(DATE_KEY_PATTERN);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return todayClinicalDateKey(date);
}

export function formatClinicalDate(value: string | Date | undefined | null) {
  const key = clinicalDateKey(value);
  if (!key) return "";

  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

export function clinicalDateToStoredDateTime(value: string | Date | undefined | null) {
  const key = clinicalDateKey(value);
  return key ? `${key}T12:00:00.000Z` : "";
}

export function isClinicalDateWithinLimit(
  value: string | Date | undefined | null,
  limitDays: number,
  referenceDate = new Date()
) {
  const key = clinicalDateKey(value);
  if (!key) return true;

  const consultaDay = parseClinicalDateKey(key);
  if (!consultaDay) return false;

  const today = parseClinicalDateKey(todayClinicalDateKey(referenceDate));
  if (!today) return false;

  const minDate = new Date(today);
  minDate.setUTCDate(today.getUTCDate() - limitDays);

  return consultaDay >= minDate;
}

function parseClinicalDateKey(key: string) {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function dateKeyFromParts(year: number, month: number, day: number) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}
