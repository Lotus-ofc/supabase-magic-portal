import { describe, expect, it } from "vitest";
import {
  BRANDBOOK_REGISTRY,
  listBrandbooksForClients,
  resolveBrandbookForClient,
} from "./registry";

describe("brandbook registry", () => {
  it("resolve Cláudia por slug ou nome", () => {
    expect(resolveBrandbookForClient({ slug: "claudia-tambelini", nome_cliente: "Outro" })?.id).toBe(
      "claudia",
    );
    expect(resolveBrandbookForClient({ slug: "x", nome_cliente: "Cláudia Tambelini" })?.id).toBe(
      "claudia",
    );
  });

  it("lista brand books únicos por cliente", () => {
    const list = listBrandbooksForClients([
      { slug: "claudia-tambelini", nome_cliente: "Cláudia Tambelini" },
      { slug: "outro", nome_cliente: "Outro Cliente" },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]?.brandbook.id).toBe("claudia");
  });

  it("mantém ao menos o brand book da Cláudia no registro", () => {
    expect(BRANDBOOK_REGISTRY.some((entry) => entry.id === "claudia")).toBe(true);
  });
});
