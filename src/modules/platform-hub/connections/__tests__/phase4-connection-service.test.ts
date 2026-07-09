import { describe, expect, it } from "vitest";
import { asScopeRef } from "../../../../../contracts/connection/scope-ref.v1";
import {
  asCredentialKey,
  CREDENTIAL_VAULT_CONTRACT_VERSION,
} from "../../../../../contracts/credential/credential-vault.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../../contracts/ingest/ingest-envelope.v1";
import { createConnectionResolver } from "../create-connection-resolver";
import { createConnectionStack } from "../create-connection-stack";
import { collectIngestEnvelope } from "../../plugins/_internal/provider-framework";

describe("Fase 4 — Connection Service", () => {
  it("cria connection independente da plataforma via Registry", async () => {
    const { connectionService } = createConnectionStack();

    const example = await connectionService.create({
      pluginKey: "example",
      label: "Example Conn",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const meta = await connectionService.create({
      pluginKey: "meta_ads",
      label: "Meta Conn",
      scopeRef: asScopeRef("cadastro:42"),
    });

    expect(example.pluginKey).toBe("example");
    expect(meta.pluginKey).toBe("meta_ads");
    expect(example.connectionId).not.toBe(meta.connectionId);
  });

  it("atualiza connection", async () => {
    const { connectionService } = createConnectionStack();
    const created = await connectionService.create({
      pluginKey: "example",
      label: "Before",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const updated = await connectionService.update(created.connectionId, { label: "After" });
    expect(updated.label).toBe("After");
  });

  it("troca provider ativo (dual-run ready)", async () => {
    const { connectionService } = createConnectionStack();
    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Dual-run",
      scopeRef: asScopeRef("cadastro:42"),
    });

    expect(connection.activeProviderType).toBe("make_passive");

    const switched = await connectionService.setActiveProvider(
      connection.connectionId,
      "official_api",
    );
    expect(switched.activeProviderType).toBe("official_api");

    const provider = await connectionService.getActiveProvider(connection.connectionId);
    expect(provider.providerType).toBe("official_api");
  });

  it("resolve provider pela connection — nunca direto do plugin", async () => {
    const { connectionService } = createConnectionStack();
    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Via Connection",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const provider = await connectionService.getActiveProvider(connection.connectionId);
    const envelope = await provider.collect({
      connectionId: connection.connectionId,
      capability: connection.capability,
      identities: [],
    });

    expect(isMetricsTimeseriesEnvelope(envelope)).toBe(true);
    if (!isMetricsTimeseriesEnvelope(envelope)) throw new Error("expected metrics-timeseries");
    expect(envelope.payload.canonicalClientName).toBe("");
  });
});

describe("Fase 4 — Identity Service", () => {
  it("anexa múltiplas identities validadas pelo manifest", async () => {
    const { connectionService, identityService } = createConnectionStack();
    const connection = await connectionService.create({
      pluginKey: "meta_ads",
      label: "Meta identities",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await identityService.attach({
      connectionId: connection.connectionId,
      identityType: "business",
      externalId: "biz-1",
      label: "Business",
    });
    await identityService.attach({
      connectionId: connection.connectionId,
      identityType: "ad_account",
      externalId: "act-1",
      label: "Ad Account",
      isPrimary: true,
    });
    await identityService.attach({
      connectionId: connection.connectionId,
      identityType: "instagram",
      externalId: "ig-1",
      label: "Instagram",
    });

    const identities = await identityService.list(connection.connectionId);
    expect(identities).toHaveLength(3);
    expect(identities.find((id) => id.isPrimary)?.identityType).toBe("ad_account");
  });
});

describe("Fase 4 — Credential Vault", () => {
  it("isola credenciais por connection", async () => {
    const { connectionService, credentialVault } = createConnectionStack();
    const a = await connectionService.create({
      pluginKey: "example",
      label: "A",
      scopeRef: asScopeRef("cadastro:42"),
    });
    const b = await connectionService.create({
      pluginKey: "example",
      label: "B",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const key = asCredentialKey("api_token");
    await credentialVault.store(a.connectionId, key, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { token: "secret-a" },
    });
    await credentialVault.store(b.connectionId, key, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { token: "secret-b" },
    });

    const fromA = await credentialVault.retrieve(a.connectionId, key);
    const fromB = await credentialVault.retrieve(b.connectionId, key);

    expect(fromA?.data.token).toBe("secret-a");
    expect(fromB?.data.token).toBe("secret-b");
  });
});

describe("Fase 4 — fluxo arquitetural completo", () => {
  it("Connection → Provider → IngestEnvelope (contrato Fase 3 preservado)", async () => {
    const { connectionService, identityService, credentialVault, bridge } = createConnectionStack();
    const resolver = createConnectionResolver(bridge);

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "E2E",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await identityService.attach({
      connectionId: connection.connectionId,
      identityType: "ad_account",
      externalId: "act-demo",
      label: "Demo Account",
      isPrimary: true,
    });

    await credentialVault.store(connection.connectionId, asCredentialKey("token"), {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { value: "opaque" },
    });

    const provider = await connectionService.getActiveProvider(connection.connectionId);
    const identities = await identityService.list(connection.connectionId);

    const envelope = await collectIngestEnvelope({
      resolver,
      provider,
      connectionId: connection.connectionId,
      capability: connection.capability,
      identities,
    });

    expect(isMetricsTimeseriesEnvelope(envelope)).toBe(true);
    if (!isMetricsTimeseriesEnvelope(envelope)) throw new Error("expected metrics-timeseries");
    expect(envelope.payload.canonicalClientName).toBe("acme_corp");
    expect(envelope.connectionId).toBe(connection.connectionId);
  });
});
