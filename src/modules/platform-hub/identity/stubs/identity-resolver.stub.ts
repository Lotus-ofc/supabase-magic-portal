import type { IdentityResolverPort } from "../ports";

/** Stub Fase 2 — implementação real na Fase 3. */
export const identityResolverStub: IdentityResolverPort = {
  normalize(_identities) {
    throw new Error("IdentityResolver not implemented — Fase 3");
  },
};
