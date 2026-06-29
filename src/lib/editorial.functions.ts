// Lotus · Server functions do Calendário Editorial + Aprovação de Conteúdo.
// Todas exigem auth. Admin tem CRUD total; cliente final só lê e transiciona
// status entre `aguardando_aprovacao` → `aprovado` ou registra
// `solicitacao_alteracao` (volta para `em_producao`).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";

const POST_STATUS = [
  "rascunho",
  "em_producao",
  "aguardando_aprovacao",
  "aprovado",
  "publicado",
] as const;
export type PostStatus = (typeof POST_STATUS)[number];

async function isAdmin(ctx: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string; claims?: { email?: string | null } }) {
  const email = ctx.claims?.email ?? undefined;
  if (isPlatformOwnerEmail(email)) return true;
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  return !!data;
}

async function assertAdmin(ctx: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
  claims?: { email?: string | null };
}) {
  if (!(await isAdmin(ctx))) throw new Error("Forbidden: admin role required");
}

// ---------- LIST ----------
export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        cadastro_cliente_id: z.number().int().optional().nullable(),
        cliente_nome: z.string().optional().nullable(),
        status: z.enum(POST_STATUS).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("posts_editorial")
      .select("*")
      .gte("data_publicacao", data.from)
      .lte("data_publicacao", data.to)
      .order("data_publicacao", { ascending: true });
    if (data.cadastro_cliente_id) q = q.eq("cadastro_cliente_id", data.cadastro_cliente_id);
    if (data.cliente_nome) q = q.eq("cliente_nome", data.cliente_nome);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- GET (post + revisions) ----------
export const getPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: post, error } = await context.supabase
      .from("posts_editorial")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) throw new Error("Post não encontrado");
    const { data: revisions } = await context.supabase
      .from("post_revisions")
      .select("*")
      .eq("post_id", data.id)
      .order("created_at", { ascending: false });
    return { post, revisions: revisions ?? [] };
  });

// ---------- CREATE (admin) ----------
const postCreate = z.object({
  cadastro_cliente_id: z.number().int(),
  data_publicacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  titulo: z.string().trim().min(1).max(200),
  legenda: z.string().trim().max(5000).optional().nullable(),
  plataforma: z.string().trim().max(40).default("instagram"),
  formato: z.string().trim().max(40).optional().nullable(),
  capa_url: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  status: z.enum(POST_STATUS).default("rascunho"),
});

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => postCreate.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: cli, error: e0 } = await context.supabase
      .from("cadastro_clientes")
      .select("nome_cliente")
      .eq("id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!cli) throw new Error("Cliente não encontrado");
    const payload = {
      ...data,
      cliente_nome: cli.nome_cliente,
      capa_url: data.capa_url || null,
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("posts_editorial")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPDATE (admin) ----------
export const updatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid() })
      .merge(postCreate.partial().omit({ cadastro_cliente_id: true }))
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const patch: any = { ...rest };
    if (patch.capa_url === "") patch.capa_url = null;
    const { data: row, error } = await context.supabase
      .from("posts_editorial")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- DELETE (admin) ----------
export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("posts_editorial").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- TRANSITION STATUS ----------
// Admin: pode mover para qualquer status.
// Cliente: pode aprovar (aguardando→aprovado) ou solicitar alteração
//          (aguardando→em_producao), registrando comentário obrigatório.
export const transitionPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["aprovar", "solicitar_alteracao", "set_status"]),
        status: z.enum(POST_STATUS).optional(),
        mensagem: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const { data: post, error: e0 } = await context.supabase
      .from("posts_editorial")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!post) throw new Error("Post não encontrado");

    let nextStatus: PostStatus;
    let tipo: "aprovacao" | "solicitacao_alteracao" | "mudanca_status";

    if (data.action === "aprovar") {
      if (post.status !== "aguardando_aprovacao")
        throw new Error("Só é possível aprovar posts em aprovação.");
      nextStatus = "aprovado";
      tipo = "aprovacao";
    } else if (data.action === "solicitar_alteracao") {
      if (!data.mensagem || !data.mensagem.trim())
        throw new Error("Descreva a alteração solicitada.");
      if (post.status !== "aguardando_aprovacao")
        throw new Error("Só é possível solicitar alteração de posts em aprovação.");
      nextStatus = "em_producao";
      tipo = "solicitacao_alteracao";
    } else {
      if (!admin) throw new Error("Forbidden: admin role required");
      if (!data.status) throw new Error("Status obrigatório.");
      nextStatus = data.status;
      tipo = "mudanca_status";
    }

    const { error: e1 } = await context.supabase
      .from("posts_editorial")
      .update({ status: nextStatus })
      .eq("id", data.id);
    if (e1) throw new Error(e1.message);

    const { data: user } = await context.supabase.auth.getUser();
    const { error: e2 } = await context.supabase.from("post_revisions").insert({
      post_id: data.id,
      autor_id: context.userId,
      autor_email: user?.user?.email ?? null,
      tipo,
      mensagem: data.mensagem ?? null,
      status_de: post.status,
      status_para: nextStatus,
    });
    if (e2) throw new Error(e2.message);
    return { ok: true, status: nextStatus };
  });

// ---------- ADD COMMENT ----------
export const addPostComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), mensagem: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: user } = await context.supabase.auth.getUser();
    const { error } = await context.supabase.from("post_revisions").insert({
      post_id: data.id,
      autor_id: context.userId,
      autor_email: user?.user?.email ?? null,
      tipo: "comentario",
      mensagem: data.mensagem,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- COUNTS por status (para badges) ----------
export const countPostsAguardando = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("posts_editorial")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_aprovacao");
    return { count: count ?? 0 };
  });
