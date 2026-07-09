import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAgencyOsAdmin } from "@/modules/agency-os/internal/assert-admin.server";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import {
  PhHomologationRepository,
  PhComparisonRepository,
  runHomologationDualRun,
} from "@/modules/platform-hub-bridges/homologation";
import { connectionIdSchema } from "./validators";
import { runConnectionDiagnostics } from "./services/run-diagnostics";

async function stack() {
  return createAdminHubStack(getSupabaseAdmin());
}

export const getHomologationRollout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const repo = new PhHomologationRepository(getSupabaseAdmin());
    return repo.getRolloutDashboard();
  });

export const getHomologationRolloutKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const repo = new PhComparisonRepository(getSupabaseAdmin());
    return repo.getRolloutKpis();
  });

export const getHomologationReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const supabase = getSupabaseAdmin();
    const homologationRepo = new PhHomologationRepository(supabase);
    const comparisonRepo = new PhComparisonRepository(supabase);
    const [reports, traces, comparisons] = await Promise.all([
      homologationRepo.listReports(data.connectionId),
      homologationRepo.listDebugTraces(data.connectionId),
      comparisonRepo.listByConnection(data.connectionId),
    ]);
    return { reports, traces, comparisons };
  });

export const getComparisonHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const repo = new PhComparisonRepository(getSupabaseAdmin());
    return repo.listByConnection(data.connectionId, 50);
  });

export const runHomologationDualRunFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        connectionId: z.string().uuid(),
        from: z.string().optional(),
        to: z.string().optional(),
        persistComparison: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const supabase = getSupabaseAdmin();
    const hub = await stack();
    const window = data.from && data.to ? { from: data.from, to: data.to } : undefined;
    const result = await runHomologationDualRun(hub, supabase, data.connectionId, window, {
      persistToHub: true,
      persistComparison: data.persistComparison !== false,
    });
    await hub.timeline.append({
      connectionId: data.connectionId,
      kind: "sync_finished",
      title: `Dual Run: coverage ${(result.coverage * 100).toFixed(1)}%`,
      metadata: {
        overall: result.overall,
        durationMs: result.durationMs,
        comparisonReportId: result.comparisonReportId,
      },
    });
    return result;
  });

export const persistHomologationComparison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const supabase = getSupabaseAdmin();
    const hub = await stack();
    return runHomologationDualRun(hub, supabase, data.connectionId, undefined, {
      persistToHub: true,
      persistComparison: true,
    });
  });

export const reprocessHomologationComparison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        connectionId: z.string().uuid(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const supabase = getSupabaseAdmin();
    const hub = await stack();
    const window = data.from && data.to ? { from: data.from, to: data.to } : undefined;
    return runHomologationDualRun(hub, supabase, data.connectionId, window, {
      persistToHub: true,
      persistComparison: true,
    });
  });

export const runHomologationTestSuite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const hub = await stack();
    const supabase = getSupabaseAdmin();
    const repo = new PhHomologationRepository(supabase);
    const diagnostics = await runConnectionDiagnostics(hub, data.connectionId);

    let dualRun = null;
    try {
      dualRun = await runHomologationDualRun(hub, supabase, data.connectionId);
    } catch (e) {
      await repo.saveReport({
        connectionId: data.connectionId,
        pluginKey: "unknown",
        reportKind: "dual_run",
        overall: "error",
        payload: { error: e instanceof Error ? e.message : String(e) },
      });
    }

    return { diagnostics, dualRun };
  });

export const updateHomologationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        connectionId: z.string().uuid(),
        homologationStatus: z.enum([
          "validating",
          "blocked",
          "ready",
          "official_ready",
          "make_active",
          "make_disabled",
          "cutover_ready",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const repo = new PhHomologationRepository(getSupabaseAdmin());
    await repo.updateHomologationFields(data.connectionId, {
      homologationStatus: data.homologationStatus,
    });
    return { ok: true };
  });

export const getMetricasActiveSource = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const { data, error } = await getSupabaseAdmin()
      .from("ph_metricas_source")
      .select("active_source, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { activeSource: data?.active_source ?? "make", updatedAt: data?.updated_at ?? null };
  });
