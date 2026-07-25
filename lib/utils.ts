export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return "";

  if (typeof dateString === "string") {
    const dateOnly = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return `${day}/${month}/${year}`;
    }
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}
