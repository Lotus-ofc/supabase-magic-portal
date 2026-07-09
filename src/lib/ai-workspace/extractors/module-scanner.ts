import type { ModuleInfo } from "../types";

const MODULE_LABELS: Record<string, string> = {
  auth: "Auth",
  access: "Access",
  admin: "Admin",
  approval: "Content Workflow (Approval)",
  "agency-os": "Agency OS",
  client: "Client Portal",
  core: "OS Core",
  "platform-hub": "Platform Hub",
  "platform-hub-bridges": "Platform Hub Bridges",
};

const MODULE_OBJECTIVES: Record<string, string> = {
  auth: "Autenticação de sessão — login, callback, definição de senha.",
  access: "Autorização e lifecycle de acesso — convites, recovery, gate de rotas.",
  admin: "Gestão administrativa de usuários e operações admin.",
  approval: "Workflow de conteúdo — kanban, aprovações, pilares, biblioteca.",
  "agency-os": "Operações da agência — CRM, pipeline, inteligência, prioridades.",
  client: "Portal do cliente — escopo, dashboards e aprovações read-only.",
  core: "Operating System — command bus, event bus, registries, permissions.",
  "platform-hub":
    "Integração universal — Registry, Runtime, MetricPipeline, Health, Meta official.",
  "platform-hub-bridges": "Bridges fora do kernel — legacy-cadastro, base_metricas writer/reader.",
};

const repoGlob = import.meta.glob("../../modules/**/*.repository.server.ts", {
  eager: true,
  query: "?url",
}) as Record<string, { default: string }>;

const serverGlob = import.meta.glob("../../modules/**/*.server.ts", {
  eager: true,
  query: "?url",
}) as Record<string, { default: string }>;

function moduleFromPath(path: string): string | null {
  const m = path.match(/modules\/([^/]+)\//);
  return m?.[1] ?? null;
}

function pathToShort(path: string): string {
  const idx = path.indexOf("modules/");
  return idx >= 0 ? path.slice(idx) : path;
}

export function scanModules(): ModuleInfo[] {
  const moduleIds = new Set<string>();

  for (const path of Object.keys(repoGlob)) {
    const id = moduleFromPath(path);
    if (id) moduleIds.add(id);
  }
  for (const path of Object.keys(serverGlob)) {
    const id = moduleFromPath(path);
    if (id) moduleIds.add(id);
  }

  return [...moduleIds].sort().map((id) => {
    const repos = Object.keys(repoGlob)
      .filter((p) => moduleFromPath(p) === id)
      .map(pathToShort);
    const servers = Object.keys(serverGlob)
      .filter((p) => moduleFromPath(p) === id)
      .map(pathToShort);

    const mainFiles = [...new Set([...repos, ...servers])].slice(0, 12);

    return {
      id,
      label: MODULE_LABELS[id] ?? id,
      objective: MODULE_OBJECTIVES[id] ?? `Módulo de domínio \`${id}\`.`,
      responsibilities: inferResponsibilities(id, repos, servers),
      mainFiles,
      dependencies: inferDependencies(id),
    };
  });
}

function inferResponsibilities(id: string, repos: string[], servers: string[]): string[] {
  const items: string[] = [];
  if (repos.length) items.push(`${repos.length} repository(ies) — acesso Supabase isolado`);
  if (servers.length) items.push(`${servers.length} server function(s) — API de domínio`);
  if (id === "approval") items.push("Kanban, calendário, pilares, biblioteca, dashboard ops");
  if (id === "agency-os") items.push("Central da agência, pipeline, intelligence, commands");
  if (id === "core") items.push("Command bus, event bus, config registry, permissions");
  if (id === "platform-hub") {
    items.push("Registry, SyncRuntime, MetricPipeline, Health, Meta provider");
  }
  if (id === "platform-hub-bridges") {
    items.push("legacy-cadastro, base-metricas writer, baseline reader");
  }
  return items.slice(0, 5);
}

function inferDependencies(id: string): string[] {
  const deps: Record<string, string[]> = {
    auth: ["Supabase Auth"],
    access: ["auth", "Supabase", "admin (convites)"],
    admin: ["access", "Supabase service-role"],
    approval: ["core", "client scope", "Supabase RLS"],
    "agency-os": ["core (command bus)", "Supabase"],
    client: ["access", "approval (read-only)"],
    core: ["Supabase (via commands)"],
    "platform-hub": ["contracts/", "platform-hub-bridges"],
    "platform-hub-bridges": ["platform-hub (ports)", "Supabase (somente bridges)"],
  };
  return deps[id] ?? ["Supabase"];
}

/** platform-hub não usa *.repository.server.ts — injeta entrada canônica no AI Workspace. */
export function platformHubModuleInfos(): ModuleInfo[] {
  return [
    {
      id: "platform-hub",
      label: MODULE_LABELS["platform-hub"]!,
      objective: MODULE_OBJECTIVES["platform-hub"]!,
      responsibilities: [
        "Hub Registry + PluginLoader",
        "SyncRuntime + MetricPipeline",
        "Health Engine + CredentialVault (in-memory)",
        "OfficialMetaProvider (OAuth callback adiado)",
      ],
      mainFiles: [
        "modules/platform-hub/bootstrap.ts",
        "modules/platform-hub/public/index.ts",
        "modules/platform-hub/registry/",
        "modules/platform-hub/plugins/meta_ads/",
      ],
      dependencies: inferDependencies("platform-hub"),
    },
    {
      id: "platform-hub-bridges",
      label: MODULE_LABELS["platform-hub-bridges"]!,
      objective: MODULE_OBJECTIVES["platform-hub-bridges"]!,
      responsibilities: [
        "legacy-cadastro bridge",
        "base_metricas writer (feature-flagged)",
        "baseline reader + comparison (paridade Make)",
      ],
      mainFiles: [
        "modules/platform-hub-bridges/legacy-cadastro/",
        "modules/platform-hub-bridges/base-metricas/",
        "modules/platform-hub-bridges/base-metricas-reader/",
      ],
      dependencies: inferDependencies("platform-hub-bridges"),
    },
  ];
}
