import type { ReactNode } from "react";
import { supabaseConfigError } from "@/integrations/supabase/client";
import { LotsBIWordmark } from "@/components/lotus/LotusMark";
import { BRAND_NAME } from "@/lib/brand";

/** Bloqueia a árvore com mensagem clara quando o build não tem VITE_OFFICIAL_* (evita tela preta). */
export function SupabaseConfigGuard({ children }: { children: ReactNode }) {
  if (!supabaseConfigError) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <LotsBIWordmark size="md" className="mx-auto" />
        <h1 className="text-lg font-semibold text-foreground">{BRAND_NAME} — configuração pendente</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{supabaseConfigError}</p>
        <p className="text-xs text-muted-foreground">
          No Lovable: defina <code className="text-foreground">VITE_OFFICIAL_SUPABASE_URL</code> e{" "}
          <code className="text-foreground">VITE_OFFICIAL_SUPABASE_ANON_KEY</code> nas variáveis de build.
        </p>
      </div>
    </div>
  );
}
