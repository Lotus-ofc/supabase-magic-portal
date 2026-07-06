export const OS_ROLES = {
  admin: "admin",
  gestor: "gestor",
  social_media: "social_media",
  gestor_trafego: "gestor_trafego",
  financeiro: "financeiro",
  cliente: "cliente",
  visualizador: "visualizador",
} as const;

export type OsRole = (typeof OS_ROLES)[keyof typeof OS_ROLES];

export type Permission =
  | "os:read"
  | "os:write"
  | "agency:read"
  | "agency:write"
  | "agency:pipeline"
  | "finance:read"
  | "finance:write"
  | "crm:read"
  | "crm:write"
  | "reports:read"
  | "admin:users";

export interface PermissionContext {
  userId: string;
  roles: OsRole[];
  organizationId?: string | null;
}
