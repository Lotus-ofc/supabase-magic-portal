import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Compass, Plus } from "lucide-react";
import { getPlanoForCliente, ensurePlanoCliente } from "@/lib/strategic-plan.functions";
import { clienteRefQuery } from "./cliente.$cliente";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { EmptyState } from "@/components/lotus/EmptyState";
import { Field, TextInput } from "@/components/lotus/FormField";
import { Button } from "@/components/ui/button";
import { brandTitle } from "@/lib/brand";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/plano-estrategico/")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Plano Estratégico · ${params.cliente}`) }],
  }),
  component: ClientePlanoBootstrapPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">
      Não foi possível carregar o plano: {error.message}
    </div>
  ),
});

function ClientePlanoBootstrapPage() {
  const { cliente: slug } = Route.useParams();
  return (
    <Suspense fallback={<div className="lotus-skeleton h-48 w-full rounded-xl" />}>
      <ClientePlanoBootstrap slug={slug} />
    </Suspense>
  );
}

function ClientePlanoBootstrap({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));
  const getPlanoFn = useServerFn(getPlanoForCliente);
  const ensureFn = useServerFn(ensurePlanoCliente);

  const { data: plano } = useSuspenseQuery({
    queryKey: ["strategic-plan", "cliente-plano", ref?.queryName],
    queryFn: async () => {
      if (!ref?.queryName) return null;
      return getPlanoFn({ data: { cliente_nome: ref.queryName } });
    },
  });

  useEffect(() => {
    if (plano?.id) {
      void navigate({
        to: "/cliente/$cliente/plano-estrategico/$planoId",
        params: { cliente: slug, planoId: plano.id },
        replace: true,
      });
    }
  }, [plano, slug, navigate]);

  const createMut = useMutation({
    mutationFn: (titulo?: string) =>
      ensureFn({
        data: {
          cadastro_cliente_id: ref!.cadastroId!,
          titulo: titulo?.trim() || null,
        },
      }),
    onSuccess: (res) => {
      toast.success(res.created ? "Plano Estratégico criado" : "Abrindo Plano Estratégico");
      void navigate({
        to: "/cliente/$cliente/plano-estrategico/$planoId",
        params: { cliente: slug, planoId: res.plano.id },
        replace: true,
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar plano"),
  });

  if (!ref) {
    return <div className="text-sm text-muted-foreground">Cliente não encontrado.</div>;
  }

  if (plano?.id) {
    return <div className="lotus-skeleton h-48 w-full rounded-xl" />;
  }

  return (
    <CriarPlanoGate
      refData={ref}
      onCreate={(t) => createMut.mutate(t)}
      loading={createMut.isPending}
    />
  );
}

function CriarPlanoGate({
  refData,
  onCreate,
  loading,
}: {
  refData: { nome: string; cadastroId: number | null };
  onCreate: (titulo?: string) => void;
  loading: boolean;
}) {
  const [nomePlano, setNomePlano] = useState("");

  if (!refData.cadastroId) {
    return (
      <EmptyState
        icon={Compass}
        title="Cliente sem cadastro completo"
        description="Associe este cliente em Admin → Clientes antes de criar o Plano Estratégico."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plano Estratégico"
        title={refData.nome}
        description="Cada cliente possui um único Plano Estratégico contínuo. A evolução acontece por objetivos sucessivos."
      />
      <SectionCard title="Criar Plano Estratégico">
        <div className="space-y-4">
          <EmptyState
            icon={Compass}
            title="Iniciar planejamento estratégico"
            description="Este cliente ainda não possui um Plano Estratégico. Crie uma vez — depois, evolua por objetivos."
            compact
          />
          <Field
            label="Nome do plano (opcional)"
            hint="Se vazio, usamos «Plano Estratégico · {cliente}»."
          >
            <TextInput
              value={nomePlano}
              onChange={(e) => setNomePlano(e.target.value)}
              placeholder={`Plano Estratégico · ${refData.nome}`}
            />
          </Field>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={loading}
            onClick={() => onCreate(nomePlano)}
          >
            <Plus className="h-3.5 w-3.5" />
            Criar Plano Estratégico
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
