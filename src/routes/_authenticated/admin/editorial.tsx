import { adminTitle } from "@/lib/brand";
// MVP funcional: navegação mensal, filtro por cliente, grid 7-col, drawer
// para criar / editar / aprovar / comentar. Sem dependências novas — usa
// Sheet, Select, Button já presentes em src/components/ui/*.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  transitionPost,
  addPostComment,
  type PostStatus,
} from "@/lib/editorial.functions";
import { listClientes } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MessageSquare,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { EditorialMediaUpload } from "@/components/lotus/EditorialMediaUpload";
import { MediaPreview } from "@/components/lotus/MediaPreview";
import { buildPreviewContext, capaUrlToAsset } from "@/lib/media-preview";
import { cn } from "@/lib/utils";

// ---------- Status meta ----------
const STATUS_META: Record<PostStatus, { label: string; chip: string; dot: string }> = {
  rascunho: {
    label: "Rascunho",
    chip: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  em_producao: {
    label: "Em produção",
    chip: "bg-secondary/15 text-secondary-700 dark:text-secondary-200 border-secondary/30",
    dot: "bg-[color:var(--secondary-500)]",
  },
  aguardando_aprovacao: {
    label: "Aguardando aprovação",
    chip: "bg-warning/15 text-[color:var(--warning)] border-warning/30",
    dot: "bg-[color:var(--warning)]",
  },
  aprovado: {
    label: "Aprovado",
    chip: "bg-success/15 text-[color:var(--success)] border-success/30",
    dot: "bg-[color:var(--success)]",
  },
  publicado: {
    label: "Publicado",
    chip: "bg-primary/15 text-primary-700 dark:text-primary-200 border-primary/30",
    dot: "bg-primary",
  },
};
const STATUS_ORDER: PostStatus[] = [
  "rascunho",
  "em_producao",
  "aguardando_aprovacao",
  "aprovado",
  "publicado",
];

type Post = {
  id: string;
  cadastro_cliente_id: number;
  cliente_nome: string;
  data_publicacao: string;
  titulo: string;
  legenda: string | null;
  plataforma: string;
  formato: string | null;
  capa_url: string | null;
  localizacao: string | null;
  tags: string[] | null;
  observacoes: string | null;
  responsavel_email: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
};

// ---------- Route ----------
export const Route = createFileRoute("/_authenticated/admin/editorial")({
  head: () => ({ meta: [{ title: adminTitle("Calendário Editorial") }] }),
  validateSearch: z.object({ estrategia: z.string().uuid().optional() }),
  component: EditorialPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

function EditorialPage() {
  const { estrategia: filterEstrategia } = Route.useSearch();
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [filterCli, setFilterCli] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<PostStatus | "all">("all");
  const [drawer, setDrawer] = useState<
    { mode: "create"; date: string } | { mode: "edit"; id: string } | null
  >(null);

  const monthStart = useMemo(() => isoDay(cursor), [cursor]);
  const monthEnd = useMemo(() => {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return isoDay(d);
  }, [cursor]);

  const clientesQ = useQuery({
    queryKey: ["admin", "clientes"],
    queryFn: () => listClientes(),
    staleTime: 60_000,
  });

  const postsQ = useQuery({
    queryKey: ["editorial", "month", monthStart, monthEnd, filterCli, filterEstrategia],
    queryFn: () =>
      listPosts({
        data: {
          from: monthStart,
          to: monthEnd,
          cadastro_cliente_id: filterCli === "all" ? null : Number(filterCli),
          estrategia_id: filterEstrategia ?? null,
        },
      }),
  });

  const posts = (postsQ.data ?? []) as Post[];
  const visiblePosts = useMemo(() => {
    if (filterStatus === "all") return posts;
    return posts.filter((p) => p.status === filterStatus);
  }, [posts, filterStatus]);
  const clientes = (clientesQ.data ?? []) as Array<{
    id: number;
    nome_cliente: string;
    ativo: boolean;
  }>;
  const clientesAtivos = clientes.filter((c) => c.ativo);

  const byDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of visiblePosts) {
      const arr = m.get(p.data_publicacao) ?? [];
      arr.push(p);
      m.set(p.data_publicacao, arr);
    }
    return m;
  }, [visiblePosts]);

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Conteúdo"
        title="Calendário Editorial"
        description="Planejamento, aprovação e publicação de conteúdos por cliente."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center justify-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              >
                Hoje
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight />
              </Button>
            </div>
            <Select value={filterCli} onValueChange={setFilterCli}>
              <SelectTrigger className="h-10 w-full sm:h-9 sm:w-[200px]">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clientesAtivos.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome_cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="h-10 w-full sm:h-9 sm:w-auto"
              onClick={() => setDrawer({ mode: "create", date: isoDay(today) })}
            >
              <Plus /> Novo post
            </Button>
          </div>
        }
      />

      <SectionCard
        eyebrow="Mês"
        title={cap(monthLabel)}
        description={`${visiblePosts.length} de ${posts.length} ${
          posts.length === 1 ? "post" : "posts"
        } no período${filterStatus !== "all" ? ` · filtro: ${STATUS_META[filterStatus].label}` : ""}.`}
        bodyClassName="px-0 py-0"
      >
        {postsQ.isLoading ? (
          <div className="p-6">
            <DashboardSkeleton kpiCount={0} withChart={false} />
          </div>
        ) : (
          <MonthGrid
            cursor={cursor}
            byDay={byDay}
            showCliente={filterCli === "all"}
            onPickDay={(date) => setDrawer({ mode: "create", date })}
            onPickPost={(id) => setDrawer({ mode: "edit", id })}
          />
        )}
      </SectionCard>

      {/* Legenda de status — clique para filtrar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            filterStatus === "all"
              ? "border-primary bg-primary/10 text-primary-700 dark:text-primary-200"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Todos
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus((cur) => (cur === s ? "all" : s))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              filterStatus === s
                ? STATUS_META[s].chip
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
            {STATUS_META[s].label}
          </button>
        ))}
      </div>

      {drawer && (
        <PostDrawer drawer={drawer} clientes={clientesAtivos} onClose={() => setDrawer(null)} />
      )}
    </div>
  );
}

// ---------- Month grid ----------
function MonthGrid({
  cursor,
  byDay,
  showCliente,
  onPickDay,
  onPickPost,
}: {
  cursor: Date;
  byDay: Map<string, Post[]>;
  showCliente?: boolean;
  onPickDay: (date: string) => void;
  onPickPost: (id: string) => void;
}) {
  return (
    <>
      <div className="hidden lg:block">
        <MonthGridCalendar
          cursor={cursor}
          byDay={byDay}
          showCliente={showCliente}
          onPickDay={onPickDay}
          onPickPost={onPickPost}
        />
      </div>
      <div className="lg:hidden">
        <MonthAgendaList
          cursor={cursor}
          byDay={byDay}
          showCliente={showCliente}
          onPickDay={onPickDay}
          onPickPost={onPickPost}
        />
      </div>
    </>
  );
}

function MonthAgendaList({
  cursor,
  byDay,
  showCliente,
  onPickDay,
  onPickPost,
}: {
  cursor: Date;
  byDay: Map<string, Post[]>;
  showCliente?: boolean;
  onPickDay: (date: string) => void;
  onPickPost: (id: string) => void;
}) {
  const days = useMemo(
    () => buildMonthDays(cursor).filter((d) => d.getMonth() === cursor.getMonth()),
    [cursor],
  );
  const todayIso = isoDay(new Date());

  return (
    <ul className="divide-y divide-border/60">
      {days.map((d) => {
        const iso = isoDay(d);
        const posts = byDay.get(iso) ?? [];
        const isToday = iso === todayIso;
        const dayLabel = d.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "short",
        });

        return (
          <li key={iso} className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h3
                className={cn(
                  "min-w-0 flex-1 text-sm font-semibold capitalize",
                  isToday ? "text-primary" : "text-foreground",
                )}
              >
                {dayLabel}
                {isToday && (
                  <span className="ml-2 text-[10px] font-normal normal-case text-muted-foreground">
                    Hoje
                  </span>
                )}
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 shrink-0 gap-1"
                onClick={() => onPickDay(iso)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Adicionar</span>
              </Button>
            </div>
            {posts.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Nenhum post neste dia.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {posts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onPickPost(p.id)}
                      className={cn(
                        "lotus-focus w-full rounded-lg border px-3 py-2.5 text-left transition-transform active:scale-[0.99]",
                        STATUS_META[p.status].chip,
                      )}
                    >
                      <p className="text-[13px] font-medium leading-snug">{p.titulo}</p>
                      <p className="mt-1 text-[11px] opacity-80">
                        {showCliente && <span>{p.cliente_nome} · </span>}
                        {STATUS_META[p.status].label}
                        {p.plataforma && ` · ${p.plataforma}`}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MonthGridCalendar({
  cursor,
  byDay,
  showCliente,
  onPickDay,
  onPickPost,
}: {
  cursor: Date;
  byDay: Map<string, Post[]>;
  showCliente?: boolean;
  onPickDay: (date: string) => void;
  onPickPost: (id: string) => void;
}) {
  const days = useMemo(() => buildMonthDays(cursor), [cursor]);
  const todayIso = isoDay(new Date());
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="grid grid-cols-7 border-t border-border/60">
      {weekDays.map((w) => (
        <div
          key={w}
          className="border-b border-r border-border/60 bg-muted/30 px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground last:border-r-0"
        >
          {w}
        </div>
      ))}
      {days.map((d, idx) => {
        const inMonth = d.getMonth() === cursor.getMonth();
        const iso = isoDay(d);
        const posts = byDay.get(iso) ?? [];
        const isToday = iso === todayIso;
        return (
          <div
            key={idx}
            className={cn(
              "group relative min-h-[110px] border-b border-r border-border/60 p-1.5 transition-colors last:border-r-0",
              !inMonth && "bg-muted/20",
              inMonth && "hover:bg-muted/30",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-semibold tabular-nums",
                  !inMonth && "text-muted-foreground/50",
                  inMonth && !isToday && "text-foreground",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {d.getDate()}
              </span>
              {inMonth && (
                <button
                  onClick={() => onPickDay(iso)}
                  className="lotus-focus rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  aria-label="Adicionar post"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-1 space-y-1">
              {posts.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPickPost(p.id)}
                  className={cn(
                    "w-full truncate rounded border px-1.5 py-0.5 text-left text-[10.5px] font-medium transition-transform hover:-translate-y-px",
                    STATUS_META[p.status].chip,
                  )}
                  title={`${p.cliente_nome} · ${STATUS_META[p.status].label}`}
                >
                  {showCliente && (
                    <span className="font-normal opacity-80">{p.cliente_nome} · </span>
                  )}
                  {p.titulo}
                </button>
              ))}
              {posts.length > 3 && (
                <p className="px-1 text-[10px] text-muted-foreground">+{posts.length - 3} outros</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Drawer ----------
function PostDrawer({
  drawer,
  clientes,
  onClose,
}: {
  drawer: { mode: "create"; date: string } | { mode: "edit"; id: string };
  clientes: Array<{ id: number; nome_cliente: string }>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["editorial"] });

  const getPostFn = useServerFn(getPost);
  const detailQ = useQuery({
    queryKey: ["editorial", "post", drawer.mode === "edit" ? drawer.id : null],
    queryFn: () => getPostFn({ data: { id: (drawer as any).id } }),
    enabled: drawer.mode === "edit",
  });

  const post = drawer.mode === "edit" ? (detailQ.data?.post as Post | undefined) : undefined;
  const revisions = drawer.mode === "edit" ? (detailQ.data?.revisions ?? []) : [];
  const postMedia =
    drawer.mode === "edit" && detailQ.data?.media
      ? detailQ.data.media
      : capaUrlToAsset(post?.capa_url ?? null);

  // Form state
  const [form, setForm] = useState(() => ({
    cadastro_cliente_id: clientes[0]?.id ?? 0,
    data_publicacao: drawer.mode === "create" ? drawer.date : "",
    titulo: "",
    legenda: "",
    plataforma: "instagram",
    formato: "",
    capa_url: "",
    localizacao: "",
    tags: "",
    observacoes: "",
    responsavel_email: "",
    status: "rascunho" as PostStatus,
  }));

  useEffect(() => {
    if (drawer.mode === "edit" && post) {
      setForm({
        cadastro_cliente_id: post.cadastro_cliente_id,
        data_publicacao: post.data_publicacao,
        titulo: post.titulo,
        legenda: post.legenda ?? "",
        plataforma: post.plataforma,
        formato: post.formato ?? "",
        capa_url: post.capa_url ?? "",
        localizacao: post.localizacao ?? "",
        tags: (post.tags ?? []).join(", "),
        observacoes: post.observacoes ?? "",
        responsavel_email: post.responsavel_email ?? "",
        status: post.status,
      });
    } else if (drawer.mode === "create") {
      setForm({
        cadastro_cliente_id: clientes[0]?.id ?? 0,
        data_publicacao: drawer.date,
        titulo: "",
        legenda: "",
        plataforma: "instagram",
        formato: "",
        capa_url: "",
        localizacao: "",
        tags: "",
        observacoes: "",
        responsavel_email: "",
        status: "rascunho",
      });
    }
  }, [drawer, post, clientes]);

  const [comment, setComment] = useState("");
  const [changeMsg, setChangeMsg] = useState("");

  const createFn = useServerFn(createPost);
  const updateFn = useServerFn(updatePost);
  const deleteFn = useServerFn(deletePost);
  const transitionFn = useServerFn(transitionPost);
  const commentFn = useServerFn(addPostComment);

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          cadastro_cliente_id: form.cadastro_cliente_id,
          data_publicacao: form.data_publicacao,
          titulo: form.titulo,
          legenda: form.legenda || null,
          plataforma: form.plataforma,
          formato: form.formato || null,
          localizacao: form.localizacao || null,
          tags: form.tags
            ? form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          observacoes: form.observacoes || null,
          responsavel_email: form.responsavel_email || null,
          status: form.status,
        },
      }),
    onSuccess: () => {
      toast.success("Post criado.");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: post!.id,
          data_publicacao: form.data_publicacao,
          titulo: form.titulo,
          legenda: form.legenda || null,
          plataforma: form.plataforma,
          formato: form.formato || null,
          localizacao: form.localizacao || null,
          tags: form.tags
            ? form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          observacoes: form.observacoes || null,
          responsavel_email: form.responsavel_email || null,
        },
      }),
    onSuccess: () => {
      toast.success("Post atualizado.");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: post!.id } }),
    onSuccess: () => {
      toast.success("Post excluído.");
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatusMut = useMutation({
    mutationFn: (s: PostStatus) =>
      transitionFn({ data: { id: post!.id, action: "set_status", status: s } }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      invalidate();
      qc.invalidateQueries({ queryKey: ["editorial", "post", post?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const commentMut = useMutation({
    mutationFn: () => commentFn({ data: { id: post!.id, mensagem: comment } }),
    onSuccess: () => {
      toast.success("Comentário adicionado.");
      setComment("");
      qc.invalidateQueries({ queryKey: ["editorial", "post", post?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{drawer.mode === "create" ? "Novo post" : "Editar post"}</SheetTitle>
          <SheetDescription>
            {drawer.mode === "create"
              ? "Planeje um novo conteúdo no calendário."
              : "Edite, mude status, comente ou registre histórico."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {/* Status atual + transições rápidas (apenas edit) */}
          {drawer.mode === "edit" && post && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Status atual:</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                  STATUS_META[post.status].chip,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[post.status].dot)} />
                {STATUS_META[post.status].label}
              </span>
            </div>
          )}

          {/* Form */}
          <div className="grid gap-3">
            {drawer.mode === "create" && (
              <div className="grid gap-1.5">
                <Label>Cliente</Label>
                <Select
                  value={String(form.cadastro_cliente_id)}
                  onValueChange={(v) => setForm({ ...form, cadastro_cliente_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome_cliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data_publicacao}
                  onChange={(e) => setForm({ ...form, data_publicacao: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Plataforma</Label>
                <Select
                  value={form.plataforma}
                  onValueChange={(v) => setForm({ ...form, plataforma: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="google_business">Google Business</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Formato</Label>
                <Select
                  value={form.formato || "_"}
                  onValueChange={(v) => setForm({ ...form, formato: v === "_" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">—</SelectItem>
                    <SelectItem value="feed">Feed</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="carrossel">Carrossel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {drawer.mode === "create" && (
                <div className="grid gap-1.5">
                  <Label>Status inicial</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as PostStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex.: Lançamento coleção verão"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Legenda</Label>
              <Textarea
                rows={5}
                value={form.legenda}
                onChange={(e) => setForm({ ...form, legenda: e.target.value })}
                placeholder="Texto do post…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Localização</Label>
              <Input
                value={form.localizacao}
                onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                placeholder="Ex.: São Paulo, Brasil"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="campanha, verão"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Responsável (e-mail)</Label>
                <Input
                  type="email"
                  value={form.responsavel_email}
                  onChange={(e) => setForm({ ...form, responsavel_email: e.target.value })}
                  placeholder="equipe@…"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Observações internas</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas para o cliente ou equipe…"
              />
            </div>
            {drawer.mode === "edit" && post && (
              <>
                <div className="grid gap-1.5">
                  <Label>Mídia da publicação</Label>
                  <EditorialMediaUpload
                    postId={post.id}
                    onUploaded={() => {
                      qc.invalidateQueries({ queryKey: ["editorial", "post", post.id] });
                    }}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Preview (como o cliente verá)</Label>
                  <MediaPreview
                    context={buildPreviewContext(
                      {
                        formato: form.formato || post.formato,
                        plataforma: form.plataforma,
                        legenda: form.legenda || post.legenda,
                        cliente_nome: post.cliente_nome,
                        data_publicacao: form.data_publicacao || post.data_publicacao,
                        localizacao: form.localizacao || post.localizacao,
                      },
                      postMedia as any,
                    )}
                    loading={detailQ.isLoading}
                  />
                </div>
              </>
            )}
            {drawer.mode === "create" && (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-[11px] text-muted-foreground">
                Após criar o post, envie as mídias oficiais no modo edição. O preview usa os
                arquivos enviados — não URLs.
              </p>
            )}
          </div>

          {/* Ações principais */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {drawer.mode === "create" ? (
              <Button
                className="w-full sm:w-auto"
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !form.titulo || !form.data_publicacao}
              >
                Criar post
              </Button>
            ) : (
              <>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => updateMut.mutate()}
                  disabled={updateMut.isPending}
                >
                  Salvar alterações
                </Button>
                <Select
                  value={post?.status}
                  onValueChange={(v) => setStatusMut.mutate(v as PostStatus)}
                >
                  <SelectTrigger className="h-10 w-full sm:h-9 sm:w-[200px]">
                    <SelectValue placeholder="Mudar status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (confirm("Excluir este post?")) deleteMut.mutate();
                  }}
                >
                  <Trash2 /> Excluir
                </Button>
              </>
            )}
            <Button variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
              Fechar
            </Button>
          </div>

          {/* Aprovação rápida (atalho admin) */}
          {drawer.mode === "edit" && post?.status === "aguardando_aprovacao" && (
            <div className="rounded-lg border border-warning/30 bg-warning/8 p-3">
              <p className="text-[12.5px] font-semibold text-foreground">Aprovação pendente</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Aprove diretamente ou registre uma solicitação de alteração.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    transitionFn({ data: { id: post.id, action: "aprovar" } })
                      .then(() => {
                        toast.success("Post aprovado.");
                        invalidate();
                        qc.invalidateQueries({ queryKey: ["editorial", "post", post.id] });
                      })
                      .catch((e: any) => toast.error(e.message))
                  }
                >
                  <CheckCircle2 /> Aprovar
                </Button>
              </div>
              <div className="mt-2 grid gap-1.5">
                <Textarea
                  rows={2}
                  value={changeMsg}
                  onChange={(e) => setChangeMsg(e.target.value)}
                  placeholder="Descreva a alteração necessária…"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!changeMsg.trim()}
                  onClick={() =>
                    transitionFn({
                      data: {
                        id: post.id,
                        action: "solicitar_alteracao",
                        mensagem: changeMsg,
                      },
                    })
                      .then(() => {
                        toast.success("Alteração solicitada.");
                        setChangeMsg("");
                        invalidate();
                        qc.invalidateQueries({ queryKey: ["editorial", "post", post.id] });
                      })
                      .catch((e: any) => toast.error(e.message))
                  }
                >
                  <RotateCcw /> Solicitar alteração
                </Button>
              </div>
            </div>
          )}

          {/* Comentários + histórico */}
          {drawer.mode === "edit" && post && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3 w-3" /> Histórico
              </div>
              <div className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicionar comentário…"
                />
                <Button
                  disabled={!comment.trim() || commentMut.isPending}
                  onClick={() => commentMut.mutate()}
                >
                  Enviar
                </Button>
              </div>
              <ul className="space-y-2">
                {(revisions as any[]).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-foreground">
                        {r.autor_email ?? "—"}
                      </span>
                      <span className="text-[10.5px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">
                      <RevisionLabel r={r} />
                    </p>
                    {r.mensagem && (
                      <p className="mt-1 text-[12.5px] text-foreground">{r.mensagem}</p>
                    )}
                  </li>
                ))}
                {revisions.length === 0 && (
                  <li className="text-[12px] text-muted-foreground">Sem registros ainda.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RevisionLabel({ r }: { r: any }) {
  if (r.tipo === "comentario") return <>Comentário</>;
  if (r.tipo === "aprovacao") return <>Aprovou o post</>;
  if (r.tipo === "solicitacao_alteracao") return <>Solicitou alteração</>;
  if (r.tipo === "reprovacao") return <>Reprovou o post</>;
  if (r.tipo === "mudanca_status")
    return (
      <>
        Mudou status: {r.status_de ? STATUS_META[r.status_de as PostStatus]?.label : "—"} →{" "}
        {r.status_para ? STATUS_META[r.status_para as PostStatus]?.label : "—"}
      </>
    );
  return <>{r.tipo}</>;
}

// ---------- Helpers ----------
function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function buildMonthDays(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = first.getDay(); // 0=Dom
  const start = new Date(first);
  start.setDate(first.getDate() - startWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
