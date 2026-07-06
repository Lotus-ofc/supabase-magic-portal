export type FeatureFlagScope = "global" | "organization" | "user" | "environment";

export type FeatureFlagStatus = "off" | "on" | "beta" | "experimental";

export interface FeatureFlagDefinition {
  key: string;
  module: string;
  description: string;
  defaultStatus: FeatureFlagStatus;
}

export interface FeatureFlagContext {
  userId?: string | null;
  organizationId?: string | null;
  environment?: string;
}
