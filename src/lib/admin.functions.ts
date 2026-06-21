// Server functions para o painel administrativo.
// Todas exigem auth + role 'admin'. Soft delete sempre — nunca DELETE físico de clientes.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

// ---------- CHECK ROLE ----------
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });

// ---------- CLIENTES ----------
export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("vw_clientes_admin")
      .select("*")
      .order("nome_cliente", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number }) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: cliente, error } = await context.supabase
      .from("cadastro_clientes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cliente) throw new Error("Cliente não encontrado");

    const { data: servicos } = await context.supabase
      .from("cliente_servicos")
      .select("id, servico_id, ativo, valor, observacoes")
      .eq("cadastro_cliente_id", data.id);

    const { data: acessos } = await context.supabase
      .from("client_access")
      .select("id, user_id, cliente_nome, created_at")
      .eq("cliente_nome", cliente.nome_cliente);

    return { cliente, servicos: servicos ?? [], acessos: acessos ?? [] };
  });

const clienteFields = z.object({
  nome_cliente: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Use somente a-z, 0-9 e hífen"),
  ativo: z.boolean().default(true),
  empresa: z.string().trim().max(200).optional().nullable(),
  email_principal: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  telefone: z.string().trim().max(50).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  google_ads_ativo: z.string().optional().nullable(),
  meta_ativo: z.string().optional().nullable(),
  ga4_ativo: z.string().optional().nullable(),
  instagram_ativo: z.boolean().default(false),
  google_business_ativo: z.string().optional().nullable(),
  google_business_location_id: z.string().trim().max(200).optional().nullable(),
  mlabs_url: z.string().trim().max(500).optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  valor_mensal: z.number().nullable().optional(),
});

function translatePgError(message: string): string {
  if (/duplicate key.*slug/i.test(message) || /cadastro_clientes_slug_key/i.test(message)) {
    return "Este slug já está em uso por outro cliente.";
  }
  if (/duplicate key/i.test(message)) return "Registro duplicado.";
  if (/violates foreign key/i.test(message)) return "Referência inválida.";
  if (/violates not-null/i.test(message)) return "Campo obrigatório não preenchido.";
  return message;
}

export const checkSlugAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(1), excludeId: z.number().int().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("cadastro_clientes").select("id").eq("slug", data.slug);
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: rows, error } = await q.limit(1);
    if (error) throw new Error(translatePgError(error.message));
    return { available: !rows || rows.length === 0 };
  });

export const createCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => clienteFields.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { ...data, email_principal: data.email_principal || null };
    const { data: row, error } = await context.supabase
      .from("cadastro_clientes")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(translatePgError(error.message));
    return row;
  });

export const updateCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.number().int() }).merge(clienteFields.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    if ("email_principal" in patch && !patch.email_principal) patch.email_principal = null;
    const { data: row, error } = await context.supabase
      .from("cadastro_clientes")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(translatePgError(error.message));
    return row;
  });

export const toggleClienteAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number; ativo: boolean }) =>
    z.object({ id: z.number().int(), ativo: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("cadastro_clientes")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Soft delete: alias para toggleClienteAtivo(false). DELETE físico NUNCA é exposto.
export const deactivateCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number }) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("cadastro_clientes")
      .update({ ativo: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- SERVIÇOS ----------
export const listServicos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("servicos")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(120),
        descricao: z.string().trim().max(500).optional().nullable(),
        ativo: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase
        .from("servicos")
        .update({ nome: data.nome, descricao: data.descricao ?? null, ativo: data.ativo })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("servicos")
        .insert({ nome: data.nome, descricao: data.descricao ?? null, ativo: data.ativo });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setClienteServicos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int(),
        items: z.array(
          z.object({
            servico_id: z.string().uuid(),
            ativo: z.boolean().default(true),
            valor: z.number().nullable().optional(),
            observacoes: z.string().max(500).optional().nullable(),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: current } = await context.supabase
      .from("cliente_servicos")
      .select("id, servico_id")
      .eq("cadastro_cliente_id", data.cadastro_cliente_id);
    const keep = new Set(data.items.map((i) => i.servico_id));
    const toDeactivate = (current ?? []).filter((c: any) => !keep.has(c.servico_id));
    if (toDeactivate.length) {
      await context.supabase
        .from("cliente_servicos")
        .update({ ativo: false })
        .in(
          "id",
          toDeactivate.map((c: any) => c.id),
        );
    }
    for (const item of data.items) {
      const existing = (current ?? []).find((c: any) => c.servico_id === item.servico_id);
      if (existing) {
        await context.supabase
          .from("cliente_servicos")
          .update({
            ativo: item.ativo,
            valor: item.valor ?? null,
            observacoes: item.observacoes ?? null,
          })
          .eq("id", existing.id);
      } else {
        await context.supabase.from("cliente_servicos").insert({
          cadastro_cliente_id: data.cadastro_cliente_id,
          servico_id: item.servico_id,
          ativo: item.ativo,
          valor: item.valor ?? null,
          observacoes: item.observacoes ?? null,
        });
      }
    }
    return { ok: true };
  });

// ---------- USUÁRIOS & ACESSOS ----------
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    return data.users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at }));
  });

export const grantClientAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        cadastro_cliente_id: z.number().int(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: cliente, error: e1 } = await context.supabase
      .from("cadastro_clientes")
      .select("id, nome_cliente")
      .eq("id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!cliente) throw new Error("Cliente não encontrado");

    const { error } = await context.supabase.from("client_access").insert({
      user_id: data.user_id,
      cliente_nome: cliente.nome_cliente,
      cadastro_cliente_id: cliente.id,
    });
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

export const revokeClientAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("client_access").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
