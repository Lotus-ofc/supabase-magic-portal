// ============================================================================
// Lotus · PlatformDashboardPage
// Wrapper de página — resolve cliente (slug → nome canônico), gerencia período
// e injeta no PlatformDashboard genérico.
// ============================================================================

import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/lotus/PageHeader";
import { PeriodPicker } from "@/components/lotus/PeriodPicker";
import { PlatformDashboard } from "@/components/lotus/PlatformDashboard";
import { resolvePeriod, type PeriodInput } from "@/lib/period";
import type { PlatformDef } from "@/lib/platforms/types";
import { clienteRefQuery } from "@/routes/_authenticated/cliente.$cliente";
import { useParams } from "@tanstack/react-router";

interface Props {
  def: PlatformDef;
}

export function PlatformDashboardPage({ def }: Props) {
  // Lê o param do segmento dinâmico /cliente/$cliente/...
  const { cliente: slug } = useParams({ strict: false }) as { cliente: string };
  const [periodInput, setPeriodInput] = useState<PeriodInput>({ preset: "last_30" });
  const period = useMemo(() => resolvePeriod(periodInput), [periodInput]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Plataforma"
        title={def.label}
        description={def.description}
        actions={<PeriodPicker value={periodInput} onChange={setPeriodInput} />}
      />
      <Suspense fallback={<div className="lotus-skeleton h-32 w-full" />}>
        <PlatformResolved def={def} slug={slug} period={period} />
      </Suspense>
    </div>
  );
}

function PlatformResolved({
  def,
  slug,
  period,
}: {
  def: PlatformDef;
  slug: string;
  period: ReturnType<typeof resolvePeriod>;
}) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));
  if (!ref) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }
  return <PlatformDashboard def={def} cliente={ref.queryName} period={period} />;
}
