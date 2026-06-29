import { getFormatLabel, resolveMediaFormat, buildPreviewContext } from "@/lib/media-preview";
import type { MediaAsset } from "@/lib/media-preview";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPubDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PLAT_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  google_business: "Google Business",
};

const STATUS_LABEL: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  em_producao: "Em produção",
  publicado: "Publicado",
  rascunho: "Rascunho",
};

export function PublicationMetaPanel({
  post,
  media,
  authorEmail,
}: {
  post: {
    titulo: string;
    cliente_nome: string;
    plataforma: string;
    formato: string | null;
    data_publicacao: string;
    created_at?: string;
    status: string;
    localizacao?: string | null;
    tags?: string[] | null;
    observacoes?: string | null;
    responsavel_email?: string | null;
  };
  media: MediaAsset[];
  authorEmail?: string | null;
}) {
  const ctx = buildPreviewContext(post, media);
  const formatKey = resolveMediaFormat(ctx);

  const rows: { label: string; value: string }[] = [
    { label: "Título interno", value: post.titulo },
    { label: "Cliente", value: post.cliente_nome },
    {
      label: "Rede social",
      value: PLAT_LABEL[post.plataforma] ?? post.plataforma,
    },
    { label: "Tipo", value: getFormatLabel(formatKey) },
    {
      label: "Data de criação",
      value: post.created_at ? formatDateTime(post.created_at) : "—",
    },
    { label: "Data agendada", value: formatPubDate(post.data_publicacao) },
    { label: "Autor", value: authorEmail ?? "—" },
    { label: "Responsável", value: post.responsavel_email ?? "—" },
    { label: "Status", value: STATUS_LABEL[post.status] ?? post.status },
  ];

  return (
    <div className="space-y-3 border-t border-border/60 bg-muted/10 px-4 py-4 sm:px-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Informações da publicação
      </p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-border/50 bg-background/40 px-3 py-2"
          >
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-[12.5px] font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {post.tags && post.tags.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary-700 dark:text-primary-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {post.observacoes && (
        <div className="rounded-lg border border-border/50 bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Observações</p>
          <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-foreground">
            {post.observacoes}
          </p>
        </div>
      )}
    </div>
  );
}
