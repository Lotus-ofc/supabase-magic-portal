import type { ContentCardStatus } from "../types/content-card";

export const LIBRARY_STATUSES: ContentCardStatus[] = ["publicado", "arquivado"];

export function isLibraryStatus(status: ContentCardStatus): boolean {
  return LIBRARY_STATUSES.includes(status);
}

export function isHardDeleteForbidden(status: ContentCardStatus): boolean {
  return status === "publicado" || status === "arquivado";
}
