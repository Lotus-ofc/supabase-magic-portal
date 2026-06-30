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
import { HIPOTESE_STATUS, PLANO_PRIORIDADE } from "@/lib/strategic-plan/types";
import {
  OBJETIVO_WORKFLOW_FASE,
  OBJETIVO_FASE_LABEL,
} from "@/lib/strategic-plan/objetivo-workflow";

interface StrategicPlanManageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoId: string;
  plano: PlanoEstrategico;
  objetivoAtualId: string | null;
  estrategias: PlanoEstrategia[];
  onComment: (msg: string) => void;
}

export function StrategicPlanManageDrawer({
  open,
  onOpenChange,
  planoId,
  objetivoAtualId,
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
      <SheetContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Gerenciar plano</SheetTitle>
          <SheetDescription>
            Preencha cada aba com dados claros e mensuráveis — isso alimenta diagnóstico, radar,
            próximos passos e timeline. Alterações aparecem para agência e cliente.
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
              onSave={async (payload) => {
                await upsertObjetivoFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>

          <TabsContent value="estrategia" className="mt-4">
            <EstrategiaForm
              planoId={planoId}
              objetivoId={objetivoAtualId}
              onSave={async (payload) => {
                await upsertEstrategiaFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>

          <TabsContent value="hipotese" className="mt-4">
            <HipoteseForm
              planoId={planoId}
              objetivoId={objetivoAtualId}
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
              objetivoId={objetivoAtualId}
              catalog={catalog}
              onSave={async (payload) => {
                await upsertMetricRefFn({ data: payload });
                invalidate();
              }}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <Field
            label="Comentário na timeline"
            hint="Registro livre para alinhamentos, contexto de reuniões ou observações. Visível para agência e cliente na timeline do plano."
          >
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Ex.: Alinhado em call de 15/06 — priorizar Meta Ads até revisão de criativos."
            />
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
  onSave,
}: {
  planoId: string;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [meta, setMeta] = useState("");
  const [dataAlvo, setDataAlvo] = useState("");
  const [workflowFase, setWorkflowFase] =
    useState<(typeof OBJETIVO_WORKFLOW_FASE)[number]>("em_andamento");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          plano_id: planoId,
          titulo,
          descricao: descricao || null,
          meta_numerica: meta ? Number(meta) : null,
          data_alvo: dataAlvo || null,
          workflow_fase: workflowFase,
        });
        setTitulo("");
        setDescricao("");
        setMeta("");
        setDataAlvo("");
      }}
    >
      <Field
        label="Título"
        required
        hint="Resultado mensurável que o cliente quer alcançar no período do plano."
      >
        <TextInput
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          placeholder="Ex.: Aumentar leads qualificados em 30%"
        />
      </Field>
      <Field label="Descrição" hint="Contexto e critério de sucesso do objetivo.">
        <TextArea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
      </Field>
      <FormRow>
        <Field label="Meta numérica">
          <TextInput type="number" value={meta} onChange={(e) => setMeta(e.target.value)} />
        </Field>
        <Field label="Prazo">
          <TextInput type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
        </Field>
      </FormRow>
      <Field label="Status">
        <Select
          value={workflowFase}
          onChange={(e) =>
            setWorkflowFase(e.target.value as (typeof OBJETIVO_WORKFLOW_FASE)[number])
          }
        >
          {OBJETIVO_WORKFLOW_FASE.map((f) => (
            <option key={f} value={f}>
              {OBJETIVO_FASE_LABEL[f]}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" size="sm">
        Adicionar objetivo
      </Button>
    </form>
  );
}

function EstrategiaForm({
  planoId,
  objetivoId,
  onSave,
}: {
  planoId: string;
  objetivoId: string | null;
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
        if (!objetivoId) return;
        await onSave({
          plano_id: planoId,
          objetivo_id: objetivoId,
          titulo,
          peso_percentual: Number(peso),
          prioridade,
        });
        setTitulo("");
      }}
    >
      {!objetivoId && (
        <p className="text-xs text-warning">
          Crie ou ative um objetivo antes de adicionar estratégias.
        </p>
      )}
      <Field
        label="Título"
        required
        hint="Linha de atuação concreta do plano — canal, tática ou frente de trabalho."
      >
        <TextInput
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          placeholder="Ex.: Escalar tráfego pago em Meta Ads com criativos UGC"
        />
      </Field>
      <FormRow>
        <Field
          label="Peso (%)"
          hint="Quanto desta estratégia representa no esforço ou investimento total (0–100). A soma ideal de todas as estratégias é 100%."
        >
          <TextInput
            type="number"
            min={0}
            max={100}
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="25"
          />
        </Field>
        <Field
          label="Prioridade"
          hint="Alta = foco imediato do time; média = execução contínua; baixa = suporte ou experimento."
        >
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
  objetivoId,
  onSave,
}: {
  planoId: string;
  objetivoId: string | null;
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
          objetivo_id: objetivoId,
          hipotese,
          status,
          resultado_percentual: resultado ? Number(resultado) : null,
          conclusao: conclusao || null,
        });
        setHipotese("");
      }}
    >
      <Field
        label="Hipótese"
        required
        hint="Suposição testável que explica uma oportunidade ou risco. Prefira o formato: 'Se [ação], então [resultado esperado]'."
      >
        <TextArea
          value={hipotese}
          onChange={(e) => setHipotese(e.target.value)}
          required
          placeholder="Ex.: Se publicarmos 3 Reels por semana, o alcance orgânico sobe 20% em 60 dias."
        />
      </Field>
      <FormRow>
        <Field
          label="Status"
          hint="Aberta = não testada; Em teste = em execução; Validada/Invalidada = conclusão do experimento."
        >
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {HIPOTESE_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Resultado (%)"
          hint="Variação percentual observada no teste. Deixe vazio enquanto a hipótese ainda não foi medida."
        >
          <TextInput
            type="number"
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            placeholder="Ex.: 15"
          />
        </Field>
      </FormRow>
      <Field
        label="Conclusão"
        hint="Síntese do aprendizado após validar ou invalidar — o que ficou claro para o plano."
      >
        <TextInput
          value={conclusao}
          onChange={(e) => setConclusao(e.target.value)}
          placeholder="Ex.: Frequência ajudou alcance, mas sem CTA o tráfego ao site não subiu."
        />
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
      <Field
        label="Decisão"
        required
        hint="O que foi acordado em reunião ou alinhamento. Seja direto — uma frase que qualquer pessoa entenda."
      >
        <TextInput
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          placeholder="Ex.: Pausar campanhas de topo de funil até abril"
        />
      </Field>
      <Field
        label="Motivo"
        required
        hint="Contexto, dados ou argumentos que levaram à decisão. Inclua números quando possível."
      >
        <TextArea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          placeholder="Ex.: CPA subiu 40% nas últimas 4 semanas sem ganho proporcional em leads."
        />
      </Field>
      <Field
        label="Responsável (e-mail)"
        hint="Pessoa accountable pela execução ou follow-up desta decisão. Opcional, mas recomendado."
      >
        <TextInput
          type="email"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="nome@empresa.com"
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
      <Field
        label="Ação"
        required
        hint="Tarefa operacional concreta. Aparece em Próximos Passos quando estiver pendente."
      >
        <TextInput
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          placeholder="Ex.: Revisar segmentação das campanhas de remarketing"
        />
      </Field>
      <Field
        label="Motivo estratégico"
        required
        hint="Por que esta ação importa para o plano — conecte ao objetivo ou à estratégia escolhida."
      >
        <TextArea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          placeholder="Ex.: Reduzir desperdício de verba e melhorar taxa de conversão do funil médio."
        />
      </Field>
      {estrategias.length > 0 && (
        <Field
          label="Estratégia"
          hint="Opcional. Vincula a ação a uma estratégia para rastrear execução e contadores editoriais."
        >
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
  objetivoId,
  catalog,
  onSave,
}: {
  planoId: string;
  objetivoId: string | null;
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
          objetivo_id: objetivoId,
          platform_key: platformKey,
          metric_key: entry.kind === "metric" ? entry.key : null,
          kpi_key: entry.kind === "kpi" ? entry.key : null,
          meta_numerica: meta ? Number(meta) : null,
          positive_is_good: entry.positiveIsGood,
        });
        setMeta("");
      }}
    >
      <Field
        label="Plataforma"
        hint="Fonte dos dados no Lots BI — métricas reais sincronizadas do cliente nesta plataforma."
      >
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
      <Field
        label="Métrica / KPI"
        required
        hint="Indicador monitorado no período do plano. KPIs são derivados (ex.: CPA); métricas são valores brutos (ex.: cliques)."
      >
        <Select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} required>
          <option value="">Selecione a métrica ou KPI</option>
          {platformMetrics.map((m) => (
            <option key={`${m.kind}-${m.key}`} value={m.key}>
              {m.label} ({m.kind})
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Meta numérica"
        hint="Valor alvo no período do plano. Use a mesma unidade da métrica (%, R$, quantidade, etc.)."
      >
        <TextInput
          type="number"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          placeholder="Ex.: 500 (leads), 3.5 (% CTR) ou 50000 (investimento)"
        />
      </Field>
      <Button type="submit" size="sm">
        Vincular KPI
      </Button>
    </form>
  );
}
