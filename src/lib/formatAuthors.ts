/** Join denormalized owner + collaborator names for display (e.g. cards). */
export function formatAuthorLine(
  authorName?: string,
  collaboratorNames?: string[],
): string | undefined {
  const owner = authorName?.trim() ?? "";
  const collabs = (collaboratorNames ?? []).map((n) => n.trim()).filter(Boolean);
  const parts = [...(owner ? [owner] : []), ...collabs];
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}
