/**
 * Format a person's display name into clean title case (e.g., "Andrei DIlag" -> "Andrei Dilag").
 */
export function toTitleCaseName(name?: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""
        )
        .join("-")
    )
    .join(" ");
}

/**
 * Normalize common course label typos (e.g., "ADVANCE DATABASE" -> "ADVANCED DATABASE").
 */
export function formatCourseLabel(subject?: string | null): string {
  if (!subject || !subject.trim()) return "General";
  return subject.trim().replace(/\bADVANCE\s+DATABASE\b/gi, "ADVANCED DATABASE");
}
