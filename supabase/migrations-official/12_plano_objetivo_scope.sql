-- =========================================================
-- 12_plano_objetivo_scope.sql  (aditivo, idempotente)
-- Evolução do Plano Estratégico: um plano por cliente,
-- objetivos como unidade de progresso, escopo por objetivo.
-- =========================================================

-- Objetivo: fase de workflow + período explícito
ALTER TABLE public.plano_objetivos
  ADD COLUMN IF NOT EXISTS periodo_inicio date,
  ADD COLUMN IF NOT EXISTS workflow_fase text;

-- Estratégias, hipóteses e roadmap vinculados ao objetivo
ALTER TABLE public.plano_estrategias
  ADD COLUMN IF NOT EXISTS objetivo_id uuid
  REFERENCES public.plano_objetivos(id) ON DELETE SET NULL;

ALTER TABLE public.plano_hipoteses
  ADD COLUMN IF NOT EXISTS objetivo_id uuid
  REFERENCES public.plano_objetivos(id) ON DELETE SET NULL;

ALTER TABLE public.plano_roadmap_marcos
  ADD COLUMN IF NOT EXISTS objetivo_id uuid
  REFERENCES public.plano_objetivos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS plano_estrategias_objetivo_idx
  ON public.plano_estrategias (objetivo_id);
CREATE INDEX IF NOT EXISTS plano_hipoteses_objetivo_idx
  ON public.plano_hipoteses (objetivo_id);
CREATE INDEX IF NOT EXISTS plano_roadmap_marcos_objetivo_idx
  ON public.plano_roadmap_marcos (objetivo_id);

-- Um plano ativo por cliente
CREATE UNIQUE INDEX IF NOT EXISTS planos_estrategicos_one_active_client_idx
  ON public.planos_estrategicos (cadastro_cliente_id)
  WHERE status = 'ativo';

-- Backfill workflow_fase a partir de status legado
UPDATE public.plano_objetivos
SET workflow_fase = CASE status::text
  WHEN 'pendente' THEN 'planejamento'
  WHEN 'em_andamento' THEN 'em_andamento'
  WHEN 'concluido' THEN 'concluido'
  WHEN 'cancelado' THEN 'cancelado'
  ELSE 'planejamento'
END
WHERE workflow_fase IS NULL;

-- Backfill periodo_inicio a partir de created_at
UPDATE public.plano_objetivos
SET periodo_inicio = (created_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE periodo_inicio IS NULL;

-- Backfill objetivo_id em estratégias via junction (primeiro vínculo)
UPDATE public.plano_estrategias e
SET objetivo_id = j.objetivo_id
FROM (
  SELECT DISTINCT ON (estrategia_id) estrategia_id, objetivo_id
  FROM public.plano_objetivo_estrategias
  ORDER BY estrategia_id, objetivo_id
) j
WHERE e.id = j.estrategia_id AND e.objetivo_id IS NULL;
