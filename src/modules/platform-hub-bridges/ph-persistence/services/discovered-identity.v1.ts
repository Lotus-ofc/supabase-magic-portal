/** Identidade descoberta via API oficial — bridge admin, fora do Provider Framework. */
export interface DiscoveredIdentityV1 {
  identityType: string;
  externalId: string;
  label: string;
  parentLabel?: string;
}
