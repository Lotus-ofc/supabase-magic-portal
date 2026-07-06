import type { OsRole, Permission, PermissionContext } from "../types/permissions";

const ROLE_PERMISSIONS: Record<OsRole, Permission[]> = {
  admin: [
    "os:read",
    "os:write",
    "agency:read",
    "agency:write",
    "agency:pipeline",
    "finance:read",
    "finance:write",
    "crm:read",
    "crm:write",
    "reports:read",
    "admin:users",
  ],
  gestor: [
    "os:read",
    "os:write",
    "agency:read",
    "agency:write",
    "agency:pipeline",
    "crm:read",
    "reports:read",
  ],
  social_media: ["os:read", "agency:read", "crm:read"],
  gestor_trafego: ["os:read", "agency:read", "reports:read"],
  financeiro: ["os:read", "finance:read", "finance:write", "reports:read"],
  cliente: ["os:read"],
  visualizador: ["os:read", "reports:read"],
};

export class PermissionEngine {
  can(ctx: PermissionContext, permission: Permission): boolean {
    const perms = new Set<Permission>();
    for (const role of ctx.roles) {
      for (const p of ROLE_PERMISSIONS[role] ?? []) perms.add(p);
    }
    return perms.has(permission);
  }

  canAny(ctx: PermissionContext, permissions: Permission[]): boolean {
    return permissions.some((p) => this.can(ctx, p));
  }

  canAll(ctx: PermissionContext, permissions: Permission[]): boolean {
    return permissions.every((p) => this.can(ctx, p));
  }

  permissionsForRoles(roles: OsRole[]): Permission[] {
    const perms = new Set<Permission>();
    for (const role of roles) {
      for (const p of ROLE_PERMISSIONS[role] ?? []) perms.add(p);
    }
    return [...perms];
  }
}

export const permissionEngine = new PermissionEngine();

/** Hoje: admin via has_role — mapeado para PermissionContext. */
export function permissionContextFromAdmin(userId: string): PermissionContext {
  return { userId, roles: ["admin"] };
}
