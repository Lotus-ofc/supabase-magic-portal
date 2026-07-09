import registryReport from "../../../../scripts/generated/registry-report.json";

export interface PlatformHubAiContext {
  contractVersion: string;
  generatedAt: string;
  pluginCount: number;
  plugins: Array<{
    key: string;
    capabilities: string[];
    providers: string[];
    oauth?: string | null;
    identityTypes?: string[];
  }>;
  operations: {
    routes: string[];
    wizardSteps: string[];
    migrationStages: string[];
    diagnosticChecks: string[];
    credentialActions: string[];
  };
  status: {
    architectureFrozen: boolean;
    officialMeta: boolean;
    oauthCallback: boolean;
    phTables: boolean;
    adminConnectionsUi: boolean;
    identityPicker: boolean;
    credentialVaultUi: boolean;
  };
}

/** Contexto Platform Hub para AI Workspace — registry-report + operações admin. */
export function buildPlatformHubContext(): PlatformHubAiContext {
  const plugins = (registryReport.plugins ?? []).map((plugin) => ({
    key: plugin.key,
    capabilities: [...(plugin.capabilities ?? [])],
    providers: [...(plugin.providers ?? [])],
    oauth: (plugin as { oauth?: string }).oauth ?? null,
    identityTypes: [...((plugin as { identityTypes?: string[] }).identityTypes ?? [])],
  }));

  return {
    contractVersion: registryReport.contractVersion,
    generatedAt: registryReport.generatedAt,
    pluginCount: plugins.length,
    plugins,
    operations: {
      routes: [
        "/admin/conexoes",
        "/admin/conexoes/nova",
        "/admin/conexoes/:connectionId",
        "/admin/conexoes/health",
        "/admin/conexoes/migracao",
        "/admin/conexoes/testing",
        "/admin/conexoes/rollout",
        "/oauth/meta/callback",
        "/oauth/google/callback",
        "/oauth/tiktok/callback",
      ],
      wizardSteps: [
        "Cliente",
        "Plataforma",
        "Provider",
        "OAuth ou Credenciais",
        "Identidades (picker por plataforma)",
        "Teste e Sync",
      ],
      migrationStages: ["make_passive", "parity", "dual_run", "ready", "official_only", "make_off"],
      diagnosticChecks: [
        "connection",
        "registry",
        "capabilities",
        "provider",
        "api",
        "identity",
        "oauth",
        "vault",
        "permissions",
        "health",
        "pipeline",
        "writer",
        "rate_limit",
      ],
      credentialActions: ["listar", "testar", "revogar", "trocar via OAuth"],
    },
    status: {
      architectureFrozen: true,
      officialMeta: true,
      oauthCallback: true,
      phTables: true,
      adminConnectionsUi: true,
      identityPicker: true,
      credentialVaultUi: true,
    },
  };
}

export function formatPlatformHubMarkdown(): string {
  const ctx = buildPlatformHubContext();
  const pluginLines = ctx.plugins.map((plugin) => {
    const parts = [
      `\`${plugin.key}\``,
      `caps: ${plugin.capabilities.join(", ") || "—"}`,
      `providers: ${plugin.providers.join(", ")}`,
    ];
    if (plugin.oauth) parts.push(`oauth: ${plugin.oauth}`);
    if (plugin.identityTypes?.length) parts.push(`identities: ${plugin.identityTypes.join(", ")}`);
    return `- ${parts.join(" · ")}`;
  });

  return [
    "## Platform Hub (RC1)",
    "",
    `Architecture Frozen v3.3 · contract ${ctx.contractVersion} · report ${ctx.generatedAt}`,
    "",
    "### Admin UI",
    ...ctx.operations.routes.map((r) => `- ${r}`),
    "",
    "### Plugins",
    ...pluginLines,
    "",
    "### Diagnóstico",
    ...ctx.operations.diagnosticChecks.map((c) => `- ${c}`),
    "",
    "### Migração",
    ...ctx.operations.migrationStages.map((s) => `- ${s}`),
    "",
    "### Status produto",
    `- Admin UI: ${ctx.status.adminConnectionsUi ? "sim" : "não"}`,
    `- OAuth callback: ${ctx.status.oauthCallback ? "sim" : "não"}`,
    `- ph_* tables: ${ctx.status.phTables ? "sim" : "não"}`,
    `- Identity picker: ${ctx.status.identityPicker ? "sim" : "não"}`,
    `- Credential vault UI: ${ctx.status.credentialVaultUi ? "sim" : "não"}`,
    "",
    "### Documentação (Knowledge Center)",
    "- docs/13-platform-hub/README.md — índice da aba Platform Hub",
    "- docs/13-platform-hub/handoff-rc1.md — continuidade para devs",
    "- docs/13-platform-hub/homologation-guide.md — piloto e dual-run",
    "- docs/13-platform-hub/next-steps.md — backlog pós-RC1",
    "- docs/ENVIRONMENT_VARIABLES.md — OAuth e writers",
    "",
    "### Comandos",
    "- npm run hub:doctor — Gate H-02 (DB, RLS, writer)",
    "- npm run hub:registry — registry-report.json",
  ].join("\n");
}
