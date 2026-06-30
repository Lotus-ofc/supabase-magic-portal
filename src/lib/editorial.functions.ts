// Lotus · Server functions do Calendário Editorial + Aprovação de Conteúdo.
// Todas exigem auth. Admin tem CRUD total; cliente final só lê e transiciona
// status entre `aguardando_aprovacao` → `aprovado`, `reprovar` ou registra
// `solicitacao_alteracao` (volta para `em_producao`).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import {
  capaUrlToAsset,
  mapMediaRows,
  type EditorialPostMediaRow,
  type MediaAsset,
} from "@/lib/media-preview";
import {
  ESTRATEGIA_EDITORIAL_STATS_SELECT,
  POST_EDITORIAL_APPROVAL_SELECT,
  POST_EDITORIAL_SELECT,
  POST_MEDIA_SELECT,
  POST_REVISION_SELECT,
  POST_SNAPSHOT_SELECT,
} from "@/lib/db-selects";
import { z } from "zod"; = "editorial-media";
const SIGNED_URL_TTL = 3600;

const POST_STATUS = [
  "rascunho",
  "em_producao",
  "aguardando_aprovacao",
  "aprovado",
  "publicado",
] as const;
export type PostStatus = (typeof POST_STATUS)[number];

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

async function assertAdmin(ctx: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }> };
  userId: string;
  claims?: { email?: string | null };
}) {
  if (!(await isAdmin(ctx))) throw new Error("Forbidden: admin role required");
}

type SupabaseStorageCtx = {
  supabase: {
    storage: {
      from: (bucket: string) => {
        createSignedUrl: (
          path: string,
          expiresIn: number,
        ) => PromiseLike<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
        upload: (
          path: string,
          body: ArrayBuffer,
          opts: { contentType: string; upsert?: boolean },
        ) => PromiseLike<{ error: { message: string } | null }>;
        remove: (paths: string[]) => PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };
};

async function signedUrlFor(ctx: SupabaseStorageCtx, path: string): Promise<string> {
  const { data, error } = await ctx.supabase.storage
    .from(EDITORIAL_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "URL de mídia indisponível");
  return data.signedUrl;
}

async function resolvePostMedia(
  ctx: SupabaseStorageCtx,
  postId: string,
  capaUrl: string | null,
): Promise<MediaAsset[]> {
  const { data: rows } = await (ctx.supabase as any)
    .from("post_media")
    .select(POST_MEDIA_SELECT)
    .order("ordem", { ascending: true });

  const mediaRows = (rows ?? []) as EditorialPostMediaRow[];
  if (mediaRows.length === 0) return capaUrlToAsset(capaUrl);

  const urlForPath = (path: string) => signedUrlFor(ctx, path);
  const assets = await Promise.all(
    mapMediaRows(mediaRows, (path) => path).map(async (a) => {
      const row = mediaRows.find((r) => r.id === a.id)!;
      return {
        ...a,
        url: await urlForPath(row.storage_path),
        posterUrl: row.poster_path ? await urlForPath(row.poster_path) : null,
      };
    }),
  );
  return assets;
}

async function snapshotPost(ctx: { supabase: any; userId: string }, postId: string) {
  const { data: post } = await ctx.supabase
    .from("posts_editorial")
    .select(POST_EDITORIAL_SELECT)
    .maybeSingle();
  if (!post) return;
  const { data: media } = await ctx.supabase
    .from("post_media")
    .select(POST_MEDIA_SELECT)
    .order("ordem", { ascending: true });
  await ctx.supabase.from("post_snapshots").insert({
    post_id: postId,
    snapshot: { post, media: media ?? [] },
    created_by: ctx.userId,
  });
}

function inferMediaKind(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
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
        estrategia_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("posts_editorial")
      .select(POST_EDITORIAL_SELECT)
      .lte("data_publicacao", data.to)
      .order("data_publicacao", { ascending: true });
    if (data.cadastro_cliente_id) q = q.eq("cadastro_cliente_id", data.cadastro_cliente_id);
    if (data.cliente_nome) q = q.eq("cliente_nome", data.cliente_nome);
    if (data.status) q = q.eq("status", data.status);
    if (data.estrategia_id) q = q.eq("estrategia_id", data.estrategia_id);
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
      .select(POST_EDITORIAL_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) throw new Error("Post não encontrado");
    const { data: revisions } = await context.supabase
      .from("post_revisions")
      .select(POST_REVISION_SELECT)
      .eq("post_id", data.id)
      .order("created_at", { ascending: false });
    const { data: snapshots } = await (context.supabase as any)
      .from("post_snapshots")
      .select(POST_SNAPSHOT_SELECT)
      .eq("post_id", data.id)
      .order("created_at", { ascending: false })
      .limit(5);
    const media = await resolvePostMedia(context, data.id, post.capa_url);
    return { post, revisions: revisions ?? [], snapshots: snapshots ?? [], media };
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
  localizacao: z.string().trim().max(200).optional().nullable(),
  tags: z.array(z.string().trim().max(60)).optional().nullable(),
  observacoes: z.string().trim().max(5000).optional().nullable(),
  responsavel_email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  status: z.enum(POST_STATUS).default("rascunho"),
  estrategia_id: z.string().uuid().optional().nullable(),
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
      responsavel_email: data.responsavel_email || null,
      estrategia_id: data.estrategia_id || null,
      tags: data.tags ?? [],
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("posts_editorial")
      .insert(payload)
      .select(POST_EDITORIAL_SELECT)
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
    const patch: Record<string, unknown> = { ...rest };
    if (patch.capa_url === "") patch.capa_url = null;
    if (patch.responsavel_email === "") patch.responsavel_email = null;
    await snapshotPost(context, id);
    const { data: row, error } = await context.supabase
      .from("posts_editorial")
      .update(patch)
      .eq("id", id)
      .select(POST_EDITORIAL_SELECT)
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
        action: z.enum(["aprovar", "solicitar_alteracao", "reprovar", "set_status"]),
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
    let tipo: "aprovacao" | "solicitacao_alteracao" | "reprovacao" | "mudanca_status";

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
    } else if (data.action === "reprovar") {
      if (!data.mensagem || !data.mensagem.trim())
        throw new Error("Descreva o motivo da reprovação.");
      if (post.status !== "aguardando_aprovacao")
        throw new Error("Só é possível reprovar posts em aprovação.");
      nextStatus = "em_producao";
      tipo = "reprovacao";
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

// ---------- UPLOAD MEDIA (admin) ----------
export const uploadPostMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        postId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(200),
        mimeType: z.string().trim().min(3).max(100),
        base64: z.string().min(1),
        ordem: z.number().int().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${data.postId}/${Date.now()}-${safeName}`;
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const { error: upErr } = await context.supabase.storage
      .from(EDITORIAL_BUCKET)
      .upload(storagePath, bytes, { contentType: data.mimeType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { count } = await (context.supabase as any)
      .from("post_media")
      .select("id", { count: "exact", head: true })
      .eq("post_id", data.postId);
    const ordem = data.ordem ?? count ?? 0;

    const { data: row, error } = await (context.supabase as any)
      .from("post_media")
      .insert({
        post_id: data.postId,
        storage_path: storagePath,
        mime_type: data.mimeType,
        kind: inferMediaKind(data.mimeType),
        ordem,
      })
      .select(POST_MEDIA_SELECT)
      .single();
    if (error) throw new Error(error.message);
    await snapshotPost(context, data.postId);
    return row;
  });

// ---------- DELETE MEDIA (admin) ----------
export const deletePostMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ mediaId: z.string().uuid(), postId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: media, error: e0 } = await (context.supabase as any)
      .from("post_media")
      .select(POST_MEDIA_SELECT)
      .eq("id", data.mediaId)
      .eq("post_id", data.postId)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!media) throw new Error("Mídia não encontrada");
    await context.supabase.storage.from(EDITORIAL_BUCKET).remove([media.storage_path]);
    if (media.poster_path) {
      await context.supabase.storage.from(EDITORIAL_BUCKET).remove([media.poster_path]);
    }
    const { error } = await (context.supabase as any)
      .from("post_media")
      .delete()
      .eq("id", data.mediaId);
    if (error) throw new Error(error.message);
    await snapshotPost(context, data.postId);
    return { ok: true };
  });

// ---------- LIST MEDIA ----------
export const listPostMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { postId: string }) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: post } = await context.supabase
      .from("posts_editorial")
      .select("capa_url")
      .eq("id", data.postId)
      .maybeSingle();
    const media = await resolvePostMedia(context, data.postId, post?.capa_url ?? null);
    return { media };
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
