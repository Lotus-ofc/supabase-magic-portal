/**
 * @contract ConnectionId v1.0.0
 * @see contracts/connection/contract.meta.json
 */

/** UUID branded — única referência operacional do Hub (API pública e Runtime). */
export type ConnectionId = string & { readonly __brand: "ConnectionId" };

export const CONNECTION_ID_CONTRACT_VERSION = "1.0.0" as const;

export function asConnectionId(value: string): ConnectionId {
  return value as ConnectionId;
}
