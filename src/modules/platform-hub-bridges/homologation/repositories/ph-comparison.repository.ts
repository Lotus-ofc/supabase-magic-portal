import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComparisonResultV1 } from "../base-metricas-reader/comparison-service";

export type ComparisonReportStatusV1 = "ok" | "warning" | "error" | "pending";

export interface ComparisonReportV1 {
  id: string;
  connectionId: string;
  pluginKey: string;
  providerType: string;
  fromDate: string;
  toDate: string;
  baselineSource: string;
  candidateSource: string;
  coverage: number | null;
  matchedMetrics: number;
  missingMetrics: number;
  extraMetrics: number;
  valueDifferences: unknown[];
  normalizationDifferences: unknown[];
  rowsMake: number;
  rowsHub: number;
  status: ComparisonReportStatusV1;
  summary: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface RolloutKpisV1 {
  avgCoverage: number | null;
  coverageByPlatform: Array<{ pluginKey: string; avgCoverage: number; count: number }>;
  coverageByClient: Array<{ clienteNome: string; avgCoverage: number; count: number }>;
  totalComparisons: number;
  connectionsWithoutDivergenceDays: Array<{
    connectionId: string;
    label: string;
    days: number;
  }>;
  lastDivergences: Array<{
    connectionId: string;
    label: string;
    pluginKey: string;
    at: string;
    summary: string | null;
  }>;
  rowsMakeTotal: number;
  rowsHubTotal: number;
  pctDiff: number | null;
}

export class PhComparisonRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async saveComparison(input: {
    connectionId: string;
    pluginKey: string;
    providerType?: string;
    fromDate: string;
    toDate: string;
    comparison: ComparisonResultV1;
    rowsMake: number;
    rowsHub: number;
    durationMs?: number;
    status: ComparisonReportStatusV1;
    summary?: string;
  }): Promise<ComparisonReportV1> {
    const { data, error } = await this.supabase
      .from("ph_comparison_reports")
      .insert({
        connection_id: input.connectionId,
        plugin_key: input.pluginKey,
        provider_type: input.providerType ?? "official_api",
        from_date: input.fromDate,
        to_date: input.toDate,
        baseline_source: "base_metricas_make",
        candidate_source: "base_metricas_hub",
        coverage: input.comparison.coverage,
        matched_metrics: input.comparison.matchedMetrics,
        missing_metrics: input.comparison.missingMetrics,
        extra_metrics: input.comparison.extraMetrics,
        value_differences: input.comparison.valueDifferences,
        normalization_differences: input.comparison.normalizationDifferences,
        rows_make: input.rowsMake,
        rows_hub: input.rowsHub,
        status: input.status,
        summary: input.summary ?? null,
        duration_ms: input.durationMs ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(`ph_comparison_reports insert failed: ${error.message}`);
    return this.mapReport(data);
  }

  async listByConnection(connectionId: string, limit = 30): Promise<ComparisonReportV1[]> {
    const { data, error } = await this.supabase
      .from("ph_comparison_reports")
      .select("*")
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`ph_comparison_reports list failed: ${error.message}`);
    return (data ?? []).map((r) => this.mapReport(r));
  }

  async getLatest(connectionId: string): Promise<ComparisonReportV1 | null> {
    const rows = await this.listByConnection(connectionId, 1);
    return rows[0] ?? null;
  }

  async getRolloutKpis(): Promise<RolloutKpisV1> {
    const { data: reports, error } = await this.supabase
      .from("ph_comparison_reports")
      .select(
        `
        id, connection_id, plugin_key, coverage, status, summary, created_at,
        rows_make, rows_hub, value_differences,
        ph_connections(label, cadastro_clientes(nome_cliente))
      `,
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(`rollout kpis failed: ${error.message}`);

    const rows = reports ?? [];
    const withCoverage = rows.filter((r) => r.coverage != null);
    const avgCoverage =
      withCoverage.length > 0
        ? withCoverage.reduce((s, r) => s + Number(r.coverage), 0) / withCoverage.length
        : null;

    const platformMap = new Map<string, { sum: number; count: number }>();
    const clientMap = new Map<string, { sum: number; count: number }>();
    let rowsMakeTotal = 0;
    let rowsHubTotal = 0;

    for (const r of rows) {
      rowsMakeTotal += (r.rows_make as number) ?? 0;
      rowsHubTotal += (r.rows_hub as number) ?? 0;
      const cov = r.coverage != null ? Number(r.coverage) : null;
      if (cov == null) continue;
      const pk = r.plugin_key as string;
      const p = platformMap.get(pk) ?? { sum: 0, count: 0 };
      platformMap.set(pk, { sum: p.sum + cov, count: p.count + 1 });
      const conn = r.ph_connections as {
        cadastro_clientes?: { nome_cliente?: string };
      } | null;
      const cliente = conn?.cadastro_clientes?.nome_cliente ?? "—";
      const c = clientMap.get(cliente) ?? { sum: 0, count: 0 };
      clientMap.set(cliente, { sum: c.sum + cov, count: c.count + 1 });
    }

    const lastDivergences = rows
      .filter((r) => {
        const diffs = r.value_differences as unknown[];
        return Array.isArray(diffs) && diffs.length > 0;
      })
      .slice(0, 10)
      .map((r) => {
        const conn = r.ph_connections as { label?: string } | null;
        return {
          connectionId: r.connection_id as string,
          label: conn?.label ?? (r.connection_id as string),
          pluginKey: r.plugin_key as string,
          at: r.created_at as string,
          summary: r.summary as string | null,
        };
      });

    const connectionOkDays = new Map<string, { label: string; lastOk: Date }>();
    for (const r of rows) {
      const id = r.connection_id as string;
      const conn = r.ph_connections as { label?: string } | null;
      const diffs = r.value_differences as unknown[];
      const hasDiff = Array.isArray(diffs) && diffs.length > 0;
      if (!hasDiff && r.status === "ok") {
        const at = new Date(r.created_at as string);
        const prev = connectionOkDays.get(id);
        if (!prev || at > prev.lastOk) {
          connectionOkDays.set(id, { label: conn?.label ?? id, lastOk: at });
        }
      }
    }

    const now = Date.now();
    const connectionsWithoutDivergenceDays = [...connectionOkDays.entries()].map(
      ([connectionId, v]) => ({
        connectionId,
        label: v.label,
        days: Math.floor((now - v.lastOk.getTime()) / (24 * 60 * 60 * 1000)),
      }),
    );

    const pctDiff =
      rowsMakeTotal > 0 ? Math.abs(rowsHubTotal - rowsMakeTotal) / rowsMakeTotal : null;

    return {
      avgCoverage,
      coverageByPlatform: [...platformMap.entries()].map(([pluginKey, v]) => ({
        pluginKey,
        avgCoverage: v.sum / v.count,
        count: v.count,
      })),
      coverageByClient: [...clientMap.entries()].map(([clienteNome, v]) => ({
        clienteNome,
        avgCoverage: v.sum / v.count,
        count: v.count,
      })),
      totalComparisons: rows.length,
      connectionsWithoutDivergenceDays,
      lastDivergences,
      rowsMakeTotal,
      rowsHubTotal,
      pctDiff,
    };
  }

  private mapReport(row: Record<string, unknown>): ComparisonReportV1 {
    return {
      id: row.id as string,
      connectionId: row.connection_id as string,
      pluginKey: row.plugin_key as string,
      providerType: row.provider_type as string,
      fromDate: row.from_date as string,
      toDate: row.to_date as string,
      baselineSource: row.baseline_source as string,
      candidateSource: row.candidate_source as string,
      coverage: row.coverage as number | null,
      matchedMetrics: row.matched_metrics as number,
      missingMetrics: row.missing_metrics as number,
      extraMetrics: row.extra_metrics as number,
      valueDifferences: (row.value_differences as unknown[]) ?? [],
      normalizationDifferences: (row.normalization_differences as unknown[]) ?? [],
      rowsMake: row.rows_make as number,
      rowsHub: row.rows_hub as number,
      status: row.status as ComparisonReportStatusV1,
      summary: row.summary as string | null,
      durationMs: row.duration_ms as number | null,
      createdAt: row.created_at as string,
    };
  }
}
