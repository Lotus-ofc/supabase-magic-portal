import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DebugTraceV1,
  HomologationReportKindV1,
  HomologationReportV1,
  RolloutDashboardRowV1,
} from "./types";

export class PhHomologationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async saveReport(input: {
    connectionId: string;
    pluginKey: string;
    reportKind: HomologationReportKindV1;
    overall?: string | null;
    coverage?: number | null;
    payload: Record<string, unknown>;
    durationMs?: number | null;
    rowsProduced?: number;
    rowsIgnored?: number;
    warnings?: string[];
  }): Promise<HomologationReportV1> {
    const { data, error } = await this.supabase
      .from("ph_homologation_reports")
      .insert({
        connection_id: input.connectionId,
        plugin_key: input.pluginKey,
        report_kind: input.reportKind,
        overall: input.overall ?? null,
        coverage: input.coverage ?? null,
        payload: input.payload,
        duration_ms: input.durationMs ?? null,
        rows_produced: input.rowsProduced ?? 0,
        rows_ignored: input.rowsIgnored ?? 0,
        warnings: input.warnings ?? [],
      })
      .select("*")
      .single();
    if (error) throw new Error(`ph_homologation_reports insert failed: ${error.message}`);
    return this.mapReport(data);
  }

  async saveDebugTrace(input: {
    connectionId: string;
    pluginKey: string;
    operation: string;
    requestSummary: Record<string, unknown>;
    responseSummary: Record<string, unknown>;
    rateLimit?: Record<string, unknown> | null;
    pagesFetched?: number;
    rowsCollected?: number;
    rowsDiscarded?: number;
    retries?: number;
    durationMs?: number | null;
  }): Promise<DebugTraceV1> {
    const { data, error } = await this.supabase
      .from("ph_debug_traces")
      .insert({
        connection_id: input.connectionId,
        plugin_key: input.pluginKey,
        operation: input.operation,
        request_summary: this.redact(input.requestSummary),
        response_summary: this.redact(input.responseSummary),
        rate_limit: input.rateLimit ?? null,
        pages_fetched: input.pagesFetched ?? 0,
        rows_collected: input.rowsCollected ?? 0,
        rows_discarded: input.rowsDiscarded ?? 0,
        retries: input.retries ?? 0,
        duration_ms: input.durationMs ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(`ph_debug_traces insert failed: ${error.message}`);
    return this.mapTrace(data);
  }

  async listReports(connectionId: string, limit = 20): Promise<HomologationReportV1[]> {
    const { data, error } = await this.supabase
      .from("ph_homologation_reports")
      .select("*")
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`ph_homologation_reports list failed: ${error.message}`);
    return (data ?? []).map((r) => this.mapReport(r));
  }

  async listDebugTraces(connectionId: string, limit = 30): Promise<DebugTraceV1[]> {
    const { data, error } = await this.supabase
      .from("ph_debug_traces")
      .select("*")
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`ph_debug_traces list failed: ${error.message}`);
    return (data ?? []).map((r) => this.mapTrace(r));
  }

  async getRolloutDashboard(): Promise<RolloutDashboardRowV1[]> {
    const { data, error } = await this.supabase
      .from("ph_connections")
      .select(
        `
        id,label,plugin_key,active_provider_type,homologation_status,coverage,
        health_status,health_score,last_sync_at,last_comparison_at,avg_collect_ms,
        dual_run_started_at,last_error,
        cadastro_clientes(nome_cliente)
      `,
      )
      .order("plugin_key");
    if (error) throw new Error(`rollout dashboard failed: ${error.message}`);

    const now = Date.now();
    return (data ?? []).map((row) => {
      const cliente = row.cadastro_clientes as { nome_cliente?: string } | null;
      const dualStart = row.dual_run_started_at as string | null;
      const dualRunDays =
        dualStart != null
          ? Math.floor((now - new Date(dualStart).getTime()) / (24 * 60 * 60 * 1000))
          : null;
      return {
        connectionId: row.id as string,
        label: row.label as string,
        pluginKey: row.plugin_key as string,
        clienteNome: cliente?.nome_cliente ?? null,
        provider: row.active_provider_type as string,
        homologationStatus: row.homologation_status as RolloutDashboardRowV1["homologationStatus"],
        coverage: row.coverage as number | null,
        healthStatus: row.health_status as string,
        healthScore: row.health_score as number | null,
        lastSyncAt: row.last_sync_at as string | null,
        lastComparisonAt: row.last_comparison_at as string | null,
        avgCollectMs: row.avg_collect_ms as number | null,
        dualRunDays,
        lastDivergence: (row.last_error as string | null) ?? null,
      };
    });
  }

  async updateHomologationFields(
    connectionId: string,
    patch: Partial<{
      homologationStatus: string;
      lastComparisonAt: string;
      lastCoverage: number;
      avgCollectMs: number;
      dualRunStartedAt: string;
    }>,
  ): Promise<void> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.homologationStatus) updates.homologation_status = patch.homologationStatus;
    if (patch.lastComparisonAt) updates.last_comparison_at = patch.lastComparisonAt;
    if (patch.lastCoverage !== undefined) {
      updates.last_coverage = patch.lastCoverage;
      updates.coverage = patch.lastCoverage;
    }
    if (patch.avgCollectMs !== undefined) updates.avg_collect_ms = patch.avgCollectMs;
    if (patch.dualRunStartedAt) updates.dual_run_started_at = patch.dualRunStartedAt;
    const { error } = await this.supabase
      .from("ph_connections")
      .update(updates)
      .eq("id", connectionId);
    if (error) throw new Error(`homologation update failed: ${error.message}`);
  }

  private redact(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (/token|secret|password|authorization/i.test(k)) {
        out[k] = "[REDACTED]";
      } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        out[k] = this.redact(v as Record<string, unknown>);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  private mapReport(row: Record<string, unknown>): HomologationReportV1 {
    return {
      id: row.id as string,
      connectionId: row.connection_id as string,
      pluginKey: row.plugin_key as string,
      reportKind: row.report_kind as HomologationReportKindV1,
      overall: row.overall as string | null,
      coverage: row.coverage as number | null,
      payload: (row.payload as Record<string, unknown>) ?? {},
      durationMs: row.duration_ms as number | null,
      rowsProduced: row.rows_produced as number,
      rowsIgnored: row.rows_ignored as number,
      warnings: (row.warnings as string[]) ?? [],
      createdAt: row.created_at as string,
    };
  }

  private mapTrace(row: Record<string, unknown>): DebugTraceV1 {
    return {
      id: row.id as string,
      connectionId: row.connection_id as string,
      pluginKey: row.plugin_key as string,
      operation: row.operation as string,
      requestSummary: (row.request_summary as Record<string, unknown>) ?? {},
      responseSummary: (row.response_summary as Record<string, unknown>) ?? {},
      rateLimit: (row.rate_limit as Record<string, unknown>) ?? null,
      pagesFetched: row.pages_fetched as number,
      rowsCollected: row.rows_collected as number,
      rowsDiscarded: row.rows_discarded as number,
      retries: row.retries as number,
      durationMs: row.duration_ms as number | null,
      createdAt: row.created_at as string,
    };
  }
}
