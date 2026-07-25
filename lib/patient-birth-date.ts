const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const BIRTH_DATE_INPUT_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function patientBirthDateKey(value: string | Date | undefined | null) {
  if (!value) return "";

  if (typeof value === "string") {
    const match = value.match(DATE_KEY_PATTERN);
    if (match && isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return dateKeyInArgentina(date);
}

export function patientBirthDateToStoredDateTime(value: string | Date | undefined | null) {
  const key = patientBirthDateKey(value);
  return key ? `${key}T12:00:00.000Z` : "";
}

export function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join("/");
}

export function parseBirthDateInputForPocketBase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = BIRTH_DATE_INPUT_PATTERN.exec(trimmed);
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}T12:00:00.000Z`;
}

export function patientBirthAge(value: string | Date | undefined | null, referenceDate = new Date()) {
  const key = patientBirthDateKey(value);
  if (!key) return null;

  const birth = datePartsFromKey(key);
  const today = datePartsFromKey(dateKeyInArgentina(referenceDate));
  if (!birth || !today) return null;

  let age = today.year - birth.year;
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) {
    age -= 1;
  }

  return age;
}

export function patientBirthAgeLabel(value: string | Date | undefined | null, referenceDate = new Date()) {
  const age = patientBirthAge(value, referenceDate);
  return age === null ? "" : `${age} anos`;
}

function dateKeyInArgentina(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day
    ? `${year}-${month}-${day}`
    : `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function datePartsFromKey(key: string) {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 0 || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
