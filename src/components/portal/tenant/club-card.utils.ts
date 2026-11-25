/** First non-empty line of an organization description, for the one-line meta of the club cards. */
export function firstDescriptionLine(description: string | null): string | null {
  const line = description
    ?.split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean);
  return line ?? null;
}
