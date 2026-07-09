/**
 * @manual — adapter mínimo (Hello World da arquitetura).
 */
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";
import { EXAMPLE_MANIFEST } from "./example.manifest";
import { EXAMPLE_CAPABILITIES } from "./example.capabilities";
import { fakeProvider } from "./providers/fake.provider";
import { officialApiFakeProvider } from "./providers/official_api.fake.provider";

export class ExampleAdapter implements PluginAdapterPort {
  readonly manifest = EXAMPLE_MANIFEST;

  supports(capability: Capability): boolean {
    return (EXAMPLE_CAPABILITIES as readonly string[]).includes(capability);
  }

  getProvider(providerType: string): ProviderPortV1 {
    if (providerType === "make_passive") {
      return fakeProvider;
    }
    if (providerType === "official_api") {
      return officialApiFakeProvider;
    }
    throw new Error(`Provider não suportado: ${providerType}`);
  }
}
