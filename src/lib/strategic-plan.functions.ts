// Lotus · Server functions — Plano Estratégico (Centro de Inteligência).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { resolvePeriod } from "@/lib/period";
import { getPlatformDef, PLATFORM_REGISTRY } from "@/lib/platforms/registry";
import type { Row } from "@/lib/platforms/types";
import { aggregatePeriod } from "@/lib/platforms/engine";
import { z } from "zod";
import {
  PLANO_STATUS,
  PLANO_PRIORIDADE,
  PLANO_ITEM_STATUS,
  PLANO_EVENTO_TIPO,
  HIPOTESE_STATUS,
  OPORTUNIDADE_ORIGEM,
  DECISAO_RESULTADO_STATUS,
  ROADMAP_MARCO_TIPO,
  type PlanoDetail,
  type EstrategiaEditorialStats,
  type StrategicDashboardPayload,
} from "@/lib/strategic-plan/types";
import { validateMetricRef } from "@/lib/strategic-plan/metric-catalog";
import { computeMetricProgress, objectiveProgressPct } from "@/lib/strategic-plan/metric-progress";
import { buildDiagnostico } from "@/lib/strategic-plan/diagnostico";
import { deriveOportunidadesRegra, mergeOportunidades } from "@/lib/strategic-plan/oportunidades";
import { deriveProximosPassos } from "@/lib/strategic-plan/proximos-passos";
import { buildRadarAxes } from "@/lib/strategic-plan/radar-data";
import { buildAlerts } from "@/lib/strategic-plan/alerts";
import { serializePlanoSnapshot } from "@/lib/strategic-plan/snapshots";

async function isAdmin(ctx: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }> };
  userId: string;
  claims?: { email?: string | null };
}) {
  const email = ctx.claims?.email ?? undefined;
  if (isPlatformOwnerEmail(email)) return true;
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  return !!data;
}

async function assertAdmin(ctx: Parameters<typeof isAdmin>[0]) {
  if (!(await isAdmin(ctx))) throw new Error("Forbidden: admin role required");
}

async function authorEmail(ctx: {
  supabase: {
    auth: { getUser: () => PromiseLike<{ data: { user: { email?: string | null } | null } }> };
  };
}) {
  const { data } = await ctx.supabase.auth.getUser();
  return data.user?.email ?? null;
}

async function recordEvent(
  ctx: { supabase: any; userId: string },
  input: {
    plano_id: string;
    tipo: (typeof PLANO_EVENTO_TIPO)[number];
    entity_type?: string;
    entity_id?: string;
    mensagem?: string;
    payload?: Record<string, unknown>;
  },
) {
  const email = await authorEmail(ctx);
  await ctx.supabase.from("plano_eventos").insert({
    plano_id: input.plano_id,
    tipo: input.tipo,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    mensagem: input.mensagem ?? null,
    payload: input.payload ?? null,
    autor_id: ctx.userId,
    autor_email: email,
  });
}

async function loadPlanoDetail(supabase: any, planoId: string): Promise<PlanoDetail> {
  const { data: plano, error: e0 } = await supabase
    .from("planos_estrategicos")
    .select("*")
    .eq("id", planoId)
    .maybeSingle();
  if (e0) throw new Error(e0.message);
  if (!plano) throw new Error("Plano não encontrado");

  const [
    { data: objetivos },
    { data: estrategias },
    { data: metricRefs },
    { data: hipoteses },
    { data: oportunidades },
    { data: decisoes },
    { data: aprendizados },
    { data: roadmap },
    { data: acoes },
    { data: eventos },
    { data: junctions },
  ] = await Promise.all([
    supabase.from("plano_objetivos").select("*").eq("plano_id", planoId).order("ordem"),
    supabase.from("plano_estrategias").select("*").eq("plano_id", planoId).order("ordem"),
    supabase.from("plano_metric_refs").select("*").eq("plano_id", planoId),
    supabase.from("plano_hipoteses").select("*").eq("plano_id", planoId).order("ordem"),
    supabase.from("plano_oportunidades").select("*").eq("plano_id", planoId).order("ordem"),
    supabase
      .from("plano_decisoes")
      .select("*")
      .eq("plano_id", planoId)
      .order("data_decisao", { ascending: false }),
    supabase
      .from("plano_aprendizados")
      .select("*")
      .eq("plano_id", planoId)
      .order("mes_referencia", { ascending: false }),
    supabase.from("plano_roadmap_marcos").select("*").eq("plano_id", planoId).order("ordem"),
    supabase.from("plano_acoes").select("*").eq("plano_id", planoId).order("ordem"),
    supabase
      .from("plano_eventos")
      .select("*")
      .eq("plano_id", planoId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("plano_objetivo_estrategias").select("objetivo_id, estrategia_id"),
  ]);

  const estrategiaIdsByObjetivo = new Map<string, string[]>();
  for (const j of junctions ?? []) {
    const arr = estrategiaIdsByObjetivo.get(j.objetivo_id) ?? [];
    arr.push(j.estrategia_id);
    estrategiaIdsByObjetivo.set(j.objetivo_id, arr);
  }

  const objetivosWithLinks = (objetivos ?? []).map((o: any) => ({
    ...o,
    estrategia_ids: estrategiaIdsByObjetivo.get(o.id) ?? [],
  }));

  return {
    plano,
    objetivos: objetivosWithLinks,
    estrategias: estrategias ?? [],
    metricRefs: metricRefs ?? [],
    hipoteses: hipoteses ?? [],
    oportunidades: oportunidades ?? [],
    decisoes: decisoes ?? [],
    aprendizados: aprendizados ?? [],
    roadmap: roadmap ?? [],
    acoes: acoes ?? [],
    eventos: eventos ?? [],
  };
}

function parseEditorialStats(
  rows: { estrategia_id: string; status: string; total: number }[],
): Record<string, EstrategiaEditorialStats> {
  const map: Record<string, EstrategiaEditorialStats> = {};
  for (const r of rows) {
    const cur = map[r.estrategia_id] ?? {
      estrategia_id: r.estrategia_id,
      total: 0,
      publicados: 0,
      aprovados: 0,
      aguardando: 0,
      em_producao: 0,
      rascunho: 0,
    };
    const n = Number(r.total);
    cur.total += n;
    if (r.status === "publicado") cur.publicados += n;
    else if (r.status === "aprovado") cur.aprovados += n;
    else if (r.status === "aguardando_aprovacao") cur.aguardando += n;
    else if (r.status === "em_producao") cur.em_producao += n;
    else if (r.status === "rascunho") cur.rascunho += n;
    map[r.estrategia_id] = cur;
  }
  return map;
}

async function fetchPlatformRows(
  supabase: any,
  clienteNome: string,
  platformKeys: string[],
  prevFrom: string,
  to: string,
): Promise<Record<string, Row[]>> {
  const out: Record<string, Row[]> = {};
  await Promise.all(
    platformKeys.map(async (key) => {
      const def = getPlatformDef(key);
      if (!def) return;
      const { data, error } = await supabase
        .from(def.view)
        .select("*")
        .eq("cliente", clienteNome)
        .gte("data", prevFrom)
        .lte("data", to);
      if (error) throw new Error(error.message);
      out[key] = (data ?? []) as Row[];
    }),
  );
  return out;
}

async function buildDashboard(supabase: any, planoId: string): Promise<StrategicDashboardPayload> {
  const detail = await loadPlanoDetail(supabase, planoId);
  const { plano } = detail;
  const period = resolvePeriod({
    preset: "custom",
    customFrom: plano.periodo_inicio,
    customTo: plano.periodo_fim,
  });

  const platformKeys = [
    ...new Set([
      ...detail.metricRefs.map((r) => r.platform_key),
      ...Object.keys(PLATFORM_REGISTRY),
    ]),
  ];

  const rowsByPlatform = await fetchPlatformRows(
    supabase,
    plano.cliente_nome,
    platformKeys,
    period.prevFrom,
    period.to,
  );

  const metricProgress = computeMetricProgress(detail.metricRefs, rowsByPlatform, period);

  const platformAggs: Record<string, ReturnType<typeof aggregatePeriod>> = {};
  for (const key of platformKeys) {
    const def = getPlatformDef(key);
    if (!def || !rowsByPlatform[key]?.length) continue;
    platformAggs[key] = aggregatePeriod(def, rowsByPlatform[key], period);
  }

  const diagnostico = buildDiagnostico(platformAggs);
  const regras = deriveOportunidadesRegra(platformAggs);
  const { merged: oportunidadesMerged, regraOnly } = mergeOportunidades(
    detail.oportunidades,
    regras,
  );

  const estrategiaIds = detail.estrategias.map((e) => e.id);
  let editorialStatsMap: Record<string, EstrategiaEditorialStats> = {};
  if (estrategiaIds.length > 0) {
    const { data: statsRows } = await supabase
      .from("vw_estrategia_editorial_stats")
      .select("*")
      .in("estrategia_id", estrategiaIds);
    editorialStatsMap = parseEditorialStats(statsRows ?? []);
  }

  const estrategiaById = new Map(detail.estrategias.map((e) => [e.id, e]));

  const objetivos = detail.objetivos.map((o) => {
    const objRefs = metricProgress.filter((m) => m.ref.objetivo_id === o.id);
    const linked = (o.estrategia_ids ?? [])
      .map((id) => estrategiaById.get(id))
      .filter(Boolean) as typeof detail.estrategias;
    return {
      ...o,
      estrategias: linked,
      metricProgress: objRefs,
      progressPct: objectiveProgressPct(objRefs, o.progresso_manual),
    };
  });

  const estrategias = detail.estrategias.map((e) => ({
    ...e,
    editorialStats: editorialStatsMap[e.id] ?? {
      estrategia_id: e.id,
      total: 0,
      publicados: 0,
      aprovados: 0,
      aguardando: 0,
      em_producao: 0,
      rascunho: 0,
    },
  }));

  const alerts = buildAlerts({
    objetivos: detail.objetivos,
    estrategias: detail.estrategias,
    acoes: detail.acoes,
    metricProgress,
  });

  const proximosPassos = deriveProximosPassos({
    acoes: detail.acoes,
    oportunidades: oportunidadesMerged,
    hipoteses: detail.hipoteses,
    estrategias: detail.estrategias,
    editorialStats: editorialStatsMap,
    metricProgress,
  });

  const radar = buildRadarAxes({ metricProgress, estrategias: detail.estrategias });

  return {
    plano,
    objetivos,
    estrategias,
    hipoteses: detail.hipoteses,
    oportunidades: oportunidadesMerged,
    oportunidadesRegra: regraOnly,
    decisoes: detail.decisoes,
    aprendizados: detail.aprendizados,
    roadmap: detail.roadmap,
    acoes: detail.acoes,
    eventos: detail.eventos,
    diagnostico,
    radar,
    metricProgress,
    alerts,
    proximosPassos,
  };
}

// ---------- LIST ----------
export const listPlanos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int().optional(),
        status: z.enum(PLANO_STATUS).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("planos_estrategicos")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data.cadastro_cliente_id) q = q.eq("cadastro_cliente_id", data.cadastro_cliente_id);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- GET PLANO ----------
export const getPlano = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => loadPlanoDetail(context.supabase, data.id));

// ---------- STRATEGIC DASHBOARD ----------
export const getStrategicDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => buildDashboard(context.supabase, data.id));

// ---------- CREATE PLANO (admin) ----------
const planoCreate = z.object({
  cadastro_cliente_id: z.number().int(),
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().trim().max(5000).optional().nullable(),
  periodo_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodo_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(PLANO_STATUS).default("rascunho"),
  objetivo_principal: z.string().trim().max(2000).optional().nullable(),
  observacoes: z.string().trim().max(5000).optional().nullable(),
});

export const createPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => planoCreate.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: cli, error: e0 } = await context.supabase
      .from("cadastro_clientes")
      .select("nome_cliente")
      .eq("id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!cli) throw new Error("Cliente não encontrado");
    const { data: row, error } = await context.supabase
      .from("planos_estrategicos")
      .insert({
        ...data,
        cliente_nome: cli.nome_cliente,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, { plano_id: row.id, tipo: "criacao", mensagem: "Plano criado" });
    return row;
  });

// ---------- UPDATE PLANO ----------
export const updatePlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid() })
      .merge(planoCreate.partial().omit({ cadastro_cliente_id: true }))
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const detail = await loadPlanoDetail(context.supabase, id);
    await context.supabase.from("plano_snapshots").insert({
      plano_id: id,
      snapshot: serializePlanoSnapshot(detail),
      created_by: context.userId,
    });
    const { data: row, error } = await context.supabase
      .from("planos_estrategicos")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id: id,
      tipo: "edicao",
      entity_type: "plano",
      entity_id: id,
    });
    return row;
  });

// ---------- UPSERT OBJETIVO ----------
export const upsertObjetivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        meta_numerica: z.number().optional().nullable(),
        data_alvo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        progresso_manual: z.number().optional().nullable(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        ordem: z.number().int().optional(),
        estrategia_ids: z.array(z.string().uuid()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { estrategia_ids, id, plano_id, ...fields } = data;
    let row;
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("plano_objetivos")
        .update(fields)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      row = updated;
      await recordEvent(context, {
        plano_id,
        tipo: fields.meta_numerica != null ? "mudanca_meta" : "edicao",
        entity_type: "objetivo",
        entity_id: id,
      });
    } else {
      const { data: inserted, error } = await context.supabase
        .from("plano_objetivos")
        .insert({ ...fields, plano_id })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
      await recordEvent(context, {
        plano_id,
        tipo: "criacao",
        entity_type: "objetivo",
        entity_id: row.id,
      });
    }
    if (estrategia_ids) {
      await context.supabase.from("plano_objetivo_estrategias").delete().eq("objetivo_id", row.id);
      if (estrategia_ids.length > 0) {
        await context.supabase
          .from("plano_objetivo_estrategias")
          .insert(estrategia_ids.map((estrategia_id) => ({ objetivo_id: row.id, estrategia_id })));
      }
    }
    return row;
  });

// ---------- UPSERT ESTRATEGIA ----------
export const upsertEstrategia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        prioridade: z.enum(PLANO_PRIORIDADE).optional(),
        peso_percentual: z.number().min(0).max(100).optional(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        responsavel_email: z.string().trim().email().optional().nullable().or(z.literal("")),
        data_prevista: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        comentarios: z.string().trim().max(2000).optional().nullable(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, responsavel_email, ...fields } = data;
    const payload = {
      ...fields,
      responsavel_email: responsavel_email || null,
    };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_estrategias")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await recordEvent(context, {
        plano_id,
        tipo: "edicao",
        entity_type: "estrategia",
        entity_id: id,
        payload: fields.peso_percentual != null ? { peso: fields.peso_percentual } : undefined,
      });
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_estrategias")
      .insert({ ...payload, plano_id })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id,
      tipo: "criacao",
      entity_type: "estrategia",
      entity_id: row.id,
    });
    return row;
  });

// ---------- UPSERT METRIC REF ----------
export const upsertMetricRef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        objetivo_id: z.string().uuid().optional().nullable(),
        platform_key: z.string().trim().min(1),
        metric_key: z.string().trim().optional().nullable(),
        kpi_key: z.string().trim().optional().nullable(),
        meta_numerica: z.number().optional().nullable(),
        positive_is_good: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!validateMetricRef(data.platform_key, data.metric_key ?? null, data.kpi_key ?? null)) {
      throw new Error("Referência de métrica inválida");
    }
    const { id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_metric_refs")
        .update(fields)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_metric_refs")
      .insert(fields)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPSERT ACAO ----------
export const upsertAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        estrategia_id: z.string().uuid().optional().nullable(),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        motivo_estrategico: z.string().trim().min(1).max(2000),
        responsavel_email: z.string().trim().email().optional().nullable().or(z.literal("")),
        data_prevista: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        sugerido: z.boolean().optional(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, responsavel_email, ...fields } = data;
    const payload = { ...fields, responsavel_email: responsavel_email || null };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_acoes")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_acoes")
      .insert({ ...payload, plano_id })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPSERT HIPOTESE ----------
export const upsertHipotese = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        estrategia_id: z.string().uuid().optional().nullable(),
        hipotese: z.string().trim().min(1).max(2000),
        status: z.enum(HIPOTESE_STATUS).optional(),
        resultado_percentual: z.number().optional().nullable(),
        resultado_texto: z.string().trim().max(2000).optional().nullable(),
        conclusao: z.string().trim().max(2000).optional().nullable(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_hipoteses")
        .update(fields)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_hipoteses")
      .insert({ ...fields, plano_id })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPSERT OPORTUNIDADE ----------
export const upsertOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        platform_key: z.string().trim().optional().nullable(),
        insight: z.string().trim().min(1).max(500),
        acao_sugerida: z.string().trim().min(1).max(500),
        origem: z.enum(OPORTUNIDADE_ORIGEM).optional(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_oportunidades")
        .update(fields)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_oportunidades")
      .insert({ ...fields, plano_id, origem: fields.origem ?? "manual" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPSERT DECISAO ----------
export const upsertDecisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        estrategia_id: z.string().uuid().optional().nullable(),
        titulo: z.string().trim().min(1).max(200),
        motivo: z.string().trim().min(1).max(2000),
        responsavel_email: z.string().trim().email().optional().nullable().or(z.literal("")),
        resultado_texto: z.string().trim().max(2000).optional().nullable(),
        resultado_status: z.enum(DECISAO_RESULTADO_STATUS).optional(),
        data_decisao: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, responsavel_email, ...fields } = data;
    const payload = { ...fields, responsavel_email: responsavel_email || null };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_decisoes")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_decisoes")
      .insert({ ...payload, plano_id })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id,
      tipo: "decisao",
      entity_type: "decisao",
      entity_id: row.id,
      mensagem: row.titulo,
    });
    return row;
  });

// ---------- UPSERT APRENDIZADO ----------
export const upsertAprendizado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        mes_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        tags: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, tags, ...fields } = data;
    const payload = { ...fields, tags: tags ?? [] };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_aprendizados")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_aprendizados")
      .insert({ ...payload, plano_id })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id,
      tipo: "aprendizado",
      entity_type: "aprendizado",
      entity_id: row.id,
      mensagem: row.titulo,
    });
    return row;
  });

// ---------- UPSERT ROADMAP ----------
export const upsertRoadmapMarco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        tipo: z.enum(ROADMAP_MARCO_TIPO).optional(),
        semana_numero: z.number().int().optional().nullable(),
        data_prevista: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_roadmap_marcos")
        .update(fields)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_roadmap_marcos")
      .insert({ ...fields, plano_id })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- COMMENT ----------
export const addPlanoComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ plano_id: z.string().uuid(), mensagem: z.string().trim().min(1).max(2000) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await recordEvent(context, {
      plano_id: data.plano_id,
      tipo: "comentario",
      mensagem: data.mensagem,
    });
    return { ok: true };
  });

// ---------- LIST ESTRATEGIAS FOR CLIENT (editorial picker) ----------
export const listEstrategiasForCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cadastro_cliente_id: number }) =>
    z.object({ cadastro_cliente_id: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: planos } = await context.supabase
      .from("planos_estrategicos")
      .select("id")
      .eq("cadastro_cliente_id", data.cadastro_cliente_id)
      .in("status", ["ativo", "rascunho"]);
    const ids = (planos ?? []).map((p: { id: string }) => p.id);
    if (ids.length === 0) return [];
    const { data: rows, error } = await context.supabase
      .from("plano_estrategias")
      .select("id, titulo, plano_id, status")
      .in("plano_id", ids)
      .order("ordem");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
