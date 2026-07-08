import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

export type BrandbookSection = {
  id: string;
  label: string;
};

export type BrandbookEntry = {
  id: string;
  label: string;
  repoUrl: string;
  figmaUrl?: string;
  /** Slugs explícitos em cadastro_clientes */
  clientSlugs?: string[];
  /** Match heurístico quando slug ainda não está cadastrado */
  matchClient?: (client: { slug: string | null; nome_cliente: string | null }) => boolean;
  sections: BrandbookSection[];
  load: () => Promise<{ default: ComponentType }>;
};

const ClaudiaBrandbook = lazy(() =>
  import("@/brandbooks/claudia/ClaudiaBrandbook").then((m) => ({
    default: m.ClaudiaBrandbook,
  })),
);

export const BRANDBOOK_REGISTRY: BrandbookEntry[] = [
  {
    id: "claudia",
    label: "Cláudia Tambelini",
    repoUrl: "https://github.com/Lotus-ofc/Brandbookclaudia.git",
    figmaUrl:
      "https://www.figma.com/design/9Vu4VwgwJCoaJ6RgYZY5Vq/Brandbook-para-Cl%C3%A1udia-Tambelini--c%C3%B3pia-",
    clientSlugs: ["claudia-tambelini", "claudia"],
    matchClient: (client) => {
      const slug = (client.slug ?? "").toLowerCase();
      const nome = (client.nome_cliente ?? "").toLowerCase();
      return slug.includes("claudia") || nome.includes("claudia") || nome.includes("tambelini");
    },
    sections: [
      { id: "inicio", label: "Início" },
      { id: "essencia", label: "Essência da marca" },
      { id: "tom-de-voz", label: "Tom de voz" },
      { id: "identidade-visual", label: "Identidade visual" },
      { id: "tipografia", label: "Tipografia" },
      { id: "logotipo", label: "Logotipo" },
      { id: "fotografia", label: "Fotografia" },
      { id: "redes-sociais", label: "Redes sociais" },
      { id: "touchpoints", label: "Touchpoints" },
    ],
    load: () =>
      import("@/brandbooks/claudia/ClaudiaBrandbook").then((m) => ({
        default: m.ClaudiaBrandbook,
      })),
  },
];

export function resolveBrandbookForClient(client: {
  slug: string | null;
  nome_cliente: string | null;
}): BrandbookEntry | undefined {
  const slug = (client.slug ?? "").toLowerCase();
  return BRANDBOOK_REGISTRY.find((entry) => {
    if (entry.clientSlugs?.some((s) => s.toLowerCase() === slug)) return true;
    return entry.matchClient?.(client) ?? false;
  });
}

export function resolveBrandbookById(id: string): BrandbookEntry | undefined {
  return BRANDBOOK_REGISTRY.find((entry) => entry.id === id);
}

export function listBrandbooksForClients(
  clients: { slug: string | null; nome_cliente: string | null }[],
): { client: (typeof clients)[number]; brandbook: BrandbookEntry }[] {
  const seen = new Set<string>();
  const result: { client: (typeof clients)[number]; brandbook: BrandbookEntry }[] = [];

  for (const client of clients) {
    const brandbook = resolveBrandbookForClient(client);
    if (!brandbook || seen.has(brandbook.id)) continue;
    seen.add(brandbook.id);
    result.push({ client, brandbook });
  }

  return result;
}

export function getBrandbookLazyComponent(
  entry: BrandbookEntry,
): LazyExoticComponent<ComponentType> {
  if (entry.id === "claudia") return ClaudiaBrandbook;
  return lazy(entry.load);
}
