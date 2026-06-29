/**
 * Resolve variáveis Supabase no SERVIDOR (middleware, server functions, SSR).
 * NUNCA importar este arquivo em código client-side.
 *
 * Segurança:
 * - `OFFICIAL_SERVICE_ROLE_KEY` só via process.env (runtime secret).
 * - Nunca prefixar service-role com VITE_.
 * - Anon key pode usar VITE_* (pública, protegida por RLS).
 */

function pick(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function viteEnv(name: string): string | undefined {
  try {
    return (import.meta.env as Record<string, string | undefined>)[name];
  } catch {
    return undefined;
  }
}

/** URL do projeto Supabase oficial. */
export function getServerSupabaseUrl(): string | undefined {
  return pick(
    process.env.OFFICIAL_SUPABASE_URL,
    process.env.VITE_OFFICIAL_SUPABASE_URL,
    viteEnv("VITE_OFFICIAL_SUPABASE_URL"),
  );
}

/** Chave anon (RLS) — mesma do browser. */
export function getServerSupabaseAnonKey(): string | undefined {
  return pick(
    process.env.OFFICIAL_SUPABASE_ANON_KEY,
    process.env.VITE_OFFICIAL_SUPABASE_ANON_KEY,
    viteEnv("VITE_OFFICIAL_SUPABASE_ANON_KEY"),
  );
}

/** Service role — SOMENTE process.env em runtime server. Nunca VITE_. */
export function getServerSupabaseServiceRoleKey(): string | undefined {
  return pick(process.env.OFFICIAL_SERVICE_ROLE_KEY);
}

export function requireServerSupabaseAnonConfig(): { url: string; anonKey: string } {
  const url = getServerSupabaseUrl();
  const anonKey = getServerSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase config: set OFFICIAL_SUPABASE_URL and OFFICIAL_SUPABASE_ANON_KEY (runtime secrets no Lovable; VITE_OFFICIAL_* no build)",
    );
  }
  return { url, anonKey };
}
