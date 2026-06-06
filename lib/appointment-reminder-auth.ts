export function isValidReminderCronSecret(expectedSecret: string | undefined, providedSecret: string | null | undefined) {
  const expected = String(expectedSecret || "").trim();
  const provided = String(providedSecret || "").trim();
  return Boolean(expected && provided && expected === provided);
}
