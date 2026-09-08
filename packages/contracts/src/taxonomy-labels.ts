/** Localize labels supplied by a taxonomy API projection, without a catalogue. */
export function localizeTaxonomyLabels(
  labels: Readonly<Record<string, string | undefined>> | undefined,
  locale: string,
): string {
  if (!labels) return "";
  const entries = Object.entries(labels).filter(
    (entry): entry is [string, string] => Boolean(entry[1]?.trim()),
  );
  const language = locale.toLowerCase().split("-")[0];
  return (
    labels[locale]?.trim() ||
    entries
      .find(([key]) => key.toLowerCase().split("-")[0] === language)?.[1]
      .trim() ||
    labels["fr-FR"]?.trim() ||
    entries[0]?.[1].trim() ||
    ""
  );
}
