export type EditorialPillar = {
  id: string;
  cadastro_cliente_id: number;
  titulo: string;
  objetivo: string | null;
  explicacao: string | null;
  cor: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type EditorialPillarInsert = Omit<EditorialPillar, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
