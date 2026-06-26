// Browser-safe Supabase client conectado ao projeto OFICIAL (ywvhoctcmibjitvwkkhb).
// As chaves OFICIAIS usam prefixo OFFICIAL_ porque SUPABASE_ é reservado pelo Lovable.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_OFFICIAL_SUPABASE_URL ??
  (typeof process !== "undefined" ? process.env.OFFICIAL_SUPABASE_URL : undefined);

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_OFFICIAL_SUPABASE_ANON_KEY ??
  (typeof process !== "undefined" ? process.env.OFFICIAL_SUPABASE_ANON_KEY : undefined);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_OFFICIAL_SUPABASE_URL / VITE_OFFICIAL_SUPABASE_ANON_KEY env vars");
}

const PROJECT_ID = import.meta.env.VITE_OFFICIAL_SUPABASE_PROJECT_ID ?? "ywvhoctcmibjitvwkkhb";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== "undefined",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: `sb-${PROJECT_ID}-auth-token`,
  },
});
