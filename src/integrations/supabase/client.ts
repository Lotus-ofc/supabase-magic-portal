// Browser-safe Supabase client conectado ao projeto OFICIAL (ywvhoctcmibjitvwkkhb).
// As chaves OFICIAIS usam prefixo OFFICIAL_ porque SUPABASE_ é reservado pelo Lovable.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_OFFICIAL_SUPABASE_URL ??
  (typeof process !== "undefined" ? process.env.OFFICIAL_SUPABASE_URL : undefined);

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_OFFICIAL_SUPABASE_ANON_KEY ??
  (typeof process !== "undefined" ? process.env.OFFICIAL_SUPABASE_ANON_KEY : undefined);

/** Quando preenchido, a app deve exibir aviso em vez de falhar em silêncio. */
export const supabaseConfigError: string | null =
  !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY
    ? "Variáveis VITE_OFFICIAL_SUPABASE_URL e VITE_OFFICIAL_SUPABASE_ANON_KEY não estão configuradas no build."
    : null;

const PROJECT_ID = import.meta.env.VITE_OFFICIAL_SUPABASE_PROJECT_ID ?? "ywvhoctcmibjitvwkkhb";

// Fallbacks evitam throw no import (tela preta). Chamadas à API falham até o env estar correto.
const resolvedUrl = SUPABASE_URL ?? "https://ywvhoctcmibjitvwkkhb.supabase.co";
const resolvedKey = SUPABASE_PUBLISHABLE_KEY ?? "build-anon-key-not-configured";

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== "undefined",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: `sb-${PROJECT_ID}-auth-token`,
  },
});
