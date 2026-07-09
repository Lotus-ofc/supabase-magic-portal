/** Stub Fase 1 — provider real na Fase 3 */
export const makePassiveStub = {
  providerType: "make_passive" as const,
  async collect() {
    throw new Error("Provider not available in Fase 1");
  },
};
