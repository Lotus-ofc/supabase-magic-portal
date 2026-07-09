import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("30_parallel_metricas_homologation.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/30_parallel_metricas_homologation.sql"),
    "utf8",
  );

  it("renomeia base_metricas para make", () => {
    expect(sql).toContain("RENAME TO base_metricas_make");
  });

  it("cria base_metricas_hub e vw_metricas", () => {
    expect(sql).toContain("base_metricas_hub");
    expect(sql).toContain("CREATE OR REPLACE VIEW public.vw_metricas");
  });

  it("cria ph_comparison_reports e ph_metricas_source", () => {
    expect(sql).toContain("ph_comparison_reports");
    expect(sql).toContain("ph_metricas_source");
  });

  it("atualiza vw_metricas_normalizadas para vw_metricas", () => {
    expect(sql).toContain("FROM public.vw_metricas bm");
  });

  it("bloqueia writes do hub em make", () => {
    expect(sql).toContain("trg_block_platform_hub_make_writes");
  });
});
