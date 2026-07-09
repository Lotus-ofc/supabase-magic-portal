import { randomUUID } from "node:crypto";

export type IdentityId = string & { readonly __brand: "IdentityId" };

export function asIdentityId(value: string): IdentityId {
  return value as IdentityId;
}

export function newIdentityId(): IdentityId {
  return asIdentityId(randomUUID());
}
