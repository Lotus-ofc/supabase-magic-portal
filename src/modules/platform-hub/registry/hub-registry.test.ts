import { describe, expect, it } from "vitest";
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { EXAMPLE_MANIFEST } from "../plugins/example/example.manifest";
import { ExampleAdapter } from "../plugins/example/example.adapter";
import { META_ADS_MANIFEST } from "../plugins/meta_ads/meta_ads.manifest";
import { MetaAdsAdapter } from "../plugins/meta_ads/meta_ads.adapter";
import { HubRegistry } from "./hub-registry";

function exampleRegistration(): PluginRegistration {
  return { manifest: EXAMPLE_MANIFEST, adapter: new ExampleAdapter() };
}

function metaAdsRegistration(): PluginRegistration {
  return { manifest: META_ADS_MANIFEST, adapter: MetaAdsAdapter };
}

describe("HubRegistry", () => {
  it("registra plugin e recupera por key", () => {
    const registry = new HubRegistry();
    registry.register(exampleRegistration());

    const plugin = registry.getPlugin("example");
    expect(plugin.manifest.label).toBe("Example");
  });

  it("rejeita registro duplicado", () => {
    const registry = new HubRegistry();
    const registration = exampleRegistration();
    registry.register(registration);

    expect(() => registry.register(registration)).toThrow(/Duplicate plugin registration: example/);
  });

  it("rejeita plugin sem manifest.key", () => {
    const registry = new HubRegistry();
    const registration = exampleRegistration();
    const invalid = {
      ...registration,
      manifest: { ...registration.manifest, key: "" },
    };

    expect(() => registry.register(invalid)).toThrow(/manifest\.key is required/);
  });

  it("rejeita plugin com adapter.manifest.key inconsistente", () => {
    const registry = new HubRegistry();
    const registration = exampleRegistration();
    const invalid = {
      ...registration,
      adapter: { ...registration.adapter, manifest: { ...registration.manifest, key: "other" } },
    };

    expect(() => registry.register(invalid)).toThrow(/adapter\.manifest\.key mismatch/);
  });

  it("getAllPlugins retorna ordem determinística por key", () => {
    const registry = new HubRegistry();
    registry.register(metaAdsRegistration(), exampleRegistration());

    const keys = registry.getAllPlugins().map((plugin) => plugin.manifest.key);
    expect(keys).toEqual(["example", "meta_ads"]);
  });

  it("findByCapability descobre por capability, não por nome", () => {
    const registry = new HubRegistry();
    registry.register(metaAdsRegistration(), exampleRegistration());

    const matches = registry.findByCapability("meta:metrics:collect");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.manifest.key).toBe("meta_ads");
  });

  it("getMetricDefinitions lê métricas do manifest", () => {
    const registry = new HubRegistry();
    registry.register(exampleRegistration());

    const metrics = registry.getMetricDefinitions("example");
    expect(metrics.some((metric) => metric.key === "impressions")).toBe(true);
  });

  it("getApiVersions lê versões do manifest", () => {
    const registry = new HubRegistry();
    registry.register(exampleRegistration());

    const versions = registry.getApiVersions("example");
    expect(versions).toEqual(EXAMPLE_MANIFEST.versions);
  });

  it("instâncias são independentes — sem singleton escondido", () => {
    const first = new HubRegistry();
    const second = new HubRegistry();
    first.register(exampleRegistration());

    expect(first.getAllPlugins()).toHaveLength(1);
    expect(second.getAllPlugins()).toHaveLength(0);
    expect(() => second.getPlugin("example")).toThrow(/Plugin not found: example/);
  });
});
