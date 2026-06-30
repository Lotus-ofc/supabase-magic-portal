import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TextInput, TextArea, Field, FormRow } from "@/components/lotus/FormField";
import { Select } from "@/components/lotus/FormField";
import type { PlanoEstrategico, PlanoEstrategia } from "@/lib/strategic-plan/types";
import {
  upsertObjetivo,
  upsertEstrategia,
  upsertHipotese,
  upsertDecisao,
  upsertAcao,
  upsertMetricRef,
} from "@/lib/strategic-plan.functions";
import { listMetricCatalog } from "@/lib/strategic-plan/metric-catalog";
import { HIPOTESE_STATUS, PLANO_ITEM_STATUS, PLANO_PRIORIDADE } from "@/lib/strategic-plan/types";

interface StrategicPlanManageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoId: string;
  plano: PlanoEstrategico;
  estrategias: PlanoEstrategia[];
  onComment: (msg: string) => void;
}

export function StrategicPlanManageDrawer({
  open,
  onOpenChange,
  planoId,
  estrategias,
  onComment,
}: StrategicPlanManageDrawerProps) {
  const qc = useQueryClient();
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ["strategic-dashboard", planoId] });

  const upsertObjetivoFn = useServerFn(upsertObjetivo);
  const upsertEstrategiaFn = useServerFn(upsertEstrategia);
  const upsertHipoteseFn = useServerFn(upsertHipotese);
  const upsertDecisaoFn = useServerFn(upsertDecisao);
  const upsertAcaoFn = useServerFn(upsertAcao);
  const upsertMetricRefFn = useServerFn(upsertMetricRef);

  const [comment, setComment] = useState("");

  const catalog = listMetricCatalog();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Gerenciar plano</SheetTitle>
          <SheetDescription>
            Edição colaborativa — alterações aparecem na timeline.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="objetivo" className="mt-4">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="objetivo">Objetivo</TabsTrigger>
            <TabsTrigger value="estrategia">Estratégia</TabsTrigger>
            <TabsTrigger value="hipotese">Hipótese</TabsTrigger>
            <TabsTrigger value="decisao">Decisão</TabsTrigger>
            <TabsTrigger value="acao">Ação</TabsTrigger>
            <TabsTrigger value="kpi">KPI</TabsTrigger>
          </TabsList>

          <TabsContent value="objetivo" className="mt-4 space-y-3">
            <ObjetivoForm
              planoId={planoId}
              estrategiaIds={estrategias.map((e) => ({ id: e.id, titulo: e.titulo }))}
              onSave={async (payload) => {
                await upsertObjetivoFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>

          <TabsContent value="estrategia" className="mt-4">
            <EstrategiaForm
              planoId={planoId}
              onSave={async (payload) => {
                await upsertEstrategiaFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>

          <TabsContent value="hipotese" className="mt-4">
            <HipoteseForm
              planoId={planoId}
              onSave={async (payload) => {
                await upsertHipoteseFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>

          <TabsContent value="decisao" className="mt-4">
            <DecisaoForm
              planoId={planoId}
              onSave={async (payload) => {
                await upsertDecisaoFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>

          <TabsContent value="acao" className="mt-4">
            <AcaoForm
              planoId={planoId}
              estrategias={estrategias}
              onSave={async (payload) => {
                await upsertAcaoFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>

          <TabsContent value="kpi" className="mt-4">
            <KpiForm
              planoId={planoId}
              catalog={catalog}
              onSave={async (payload) => {
                await upsertMetricRefFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <Field label="Comentário na timeline">
            <TextArea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </Field>
          <Button
            size="sm"
            disabled={!comment.trim()}
            onClick={() => {
              onComment(comment.trim());
              setComment("");
            }}
          >
            Registrar comentário
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ObjetivoForm({
  planoId,
  estrategiaIds,
  onSave,
}: {
  planoId: string;
  estrategiaIds: { id: string; titulo: string }[];
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({ plano_id: planoId, titulo, estrategia_ids: selected });
        setTitulo("");
        setSelected([]);
      }}
    >
      <Field label="Título">
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      {estrategiaIds.length > 0 && (
        <Field label="Estratégias vinculadas">
          <div className="flex flex-wrap gap-2">
            {estrategiaIds.map((s) => (
              <label key={s.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                    )
                  }
                />
                {s.titulo}
              </label>
            ))}
          </div>
        </Field>
      )}
      <Button type="submit" size="sm">
        Adicionar objetivo
      </Button>
    </form>
  );
}

function EstrategiaForm({
  planoId,
  onSave,
}: {
  planoId: string;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [peso, setPeso] = useState("25");
  const [prioridade, setPrioridade] = useState<(typeof PLANO_PRIORIDADE)[number]>("media");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          plano_id: planoId,
          titulo,
          peso_percentual: Number(peso),
          prioridade,
        });
        setTitulo("");
      }}
    >
      <Field label="Título">
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <FormRow>
        <Field label="Peso (%)">
          <TextInput
            type="number"
            min={0}
            max={100}
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
          />
        </Field>
        <Field label="Prioridade">
          <Select
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
          >
            {PLANO_PRIORIDADE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </FormRow>
      <Button type="submit" size="sm">
        Adicionar estratégia
      </Button>
    </form>
  );
}

function HipoteseForm({
  planoId,
  onSave,
}: {
  planoId: string;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [hipotese, setHipotese] = useState("");
  const [status, setStatus] = useState<(typeof HIPOTESE_STATUS)[number]>("aberta");
  const [resultado, setResultado] = useState("");
  const [conclusao, setConclusao] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          plano_id: planoId,
          hipotese,
          status,
          resultado_percentual: resultado ? Number(resultado) : null,
          conclusao: conclusao || null,
        });
        setHipotese("");
      }}
    >
      <Field label="Hipótese">
        <TextArea value={hipotese} onChange={(e) => setHipotese(e.target.value)} required />
      </Field>
      <FormRow>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {HIPOTESE_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Resultado (%)">
          <TextInput
            type="number"
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
          />
        </Field>
      </FormRow>
      <Field label="Conclusão">
        <TextInput value={conclusao} onChange={(e) => setConclusao(e.target.value)} />
      </Field>
      <Button type="submit" size="sm">
        Adicionar hipótese
      </Button>
    </form>
  );
}

function DecisaoForm({
  planoId,
  onSave,
}: {
  planoId: string;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          plano_id: planoId,
          titulo,
          motivo,
          responsavel_email: responsavel || null,
        });
        setTitulo("");
        setMotivo("");
      }}
    >
      <Field label="Decisão">
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <Field label="Motivo">
        <TextArea value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
      </Field>
      <Field label="Responsável (e-mail)">
        <TextInput
          type="email"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
        />
      </Field>
      <Button type="submit" size="sm">
        Registrar decisão
      </Button>
    </form>
  );
}

function AcaoForm({
  planoId,
  estrategias,
  onSave,
}: {
  planoId: string;
  estrategias: PlanoEstrategia[];
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [estrategiaId, setEstrategiaId] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          plano_id: planoId,
          titulo,
          motivo_estrategico: motivo,
          estrategia_id: estrategiaId || null,
        });
        setTitulo("");
        setMotivo("");
      }}
    >
      <Field label="Ação">
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </Field>
      <Field label="Motivo estratégico">
        <TextArea value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
      </Field>
      {estrategias.length > 0 && (
        <Field label="Estratégia">
          <Select value={estrategiaId} onChange={(e) => setEstrategiaId(e.target.value)}>
            <option value="">—</option>
            {estrategias.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titulo}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button type="submit" size="sm">
        Adicionar ação
      </Button>
    </form>
  );
}

function KpiForm({
  planoId,
  catalog,
  onSave,
}: {
  planoId: string;
  catalog: ReturnType<typeof listMetricCatalog>;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [platformKey, setPlatformKey] = useState(catalog[0]?.platformKey ?? "");
  const [metricKey, setMetricKey] = useState("");
  const [meta, setMeta] = useState("");
  const platformMetrics = catalog.filter((c) => c.platformKey === platformKey);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const entry = catalog.find((c) => c.key === metricKey && c.platformKey === platformKey);
        if (!entry) return;
        await onSave({
          plano_id: planoId,
          platform_key: platformKey,
          metric_key: entry.kind === "metric" ? entry.key : null,
          kpi_key: entry.kind === "kpi" ? entry.key : null,
          meta_numerica: meta ? Number(meta) : null,
          positive_is_good: entry.positiveIsGood,
        });
        setMeta("");
      }}
    >
      <Field label="Plataforma">
        <Select
          value={platformKey}
          onChange={(e) => {
            setPlatformKey(e.target.value);
            setMetricKey("");
          }}
        >
          {[...new Set(catalog.map((c) => c.platformKey))].map((k) => (
            <option key={k} value={k}>
              {catalog.find((c) => c.platformKey === k)?.platformLabel ?? k}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Métrica / KPI">
        <Select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} required>
          <option value="">Selecione</option>
          {platformMetrics.map((m) => (
            <option key={`${m.kind}-${m.key}`} value={m.key}>
              {m.label} ({m.kind})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Meta numérica">
        <TextInput type="number" value={meta} onChange={(e) => setMeta(e.target.value)} />
      </Field>
      <Button type="submit" size="sm">
        Vincular KPI
      </Button>
    </form>
  );
}
