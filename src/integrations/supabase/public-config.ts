/**
 * Config pública Supabase (URL + anon key).
 * Anon key é pública por design — protegida por RLS, não é service-role.
 */

export const SUPABASE_PROJECT_ID = "ywvhoctcmibjitvwkkhb";
export const SUPABASE_DEFAULT_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

function fromImportMeta(name: string): string | undefined {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[name];
    return v?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function fromProcess(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[name];
  return v?.trim() || undefined;
}

function pickEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const v = fromImportMeta(name) ?? fromProcess(name);
    if (v) return v;
  }
  return undefined;
}

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
  projectId: string;
  source: "build" | "runtime";
}

/** Lê config embutida no build (Vite) — inclui nomes Lovable padrão e OFFICIAL_. */
export function resolveBuildTimeSupabaseConfig(): SupabasePublicConfig | null {
  const url =
    pickEnv("VITE_OFFICIAL_SUPABASE_URL", "VITE_SUPABASE_URL", "OFFICIAL_SUPABASE_URL") ??
    SUPABASE_DEFAULT_URL;

  const anonKey = pickEnv(
    "VITE_OFFICIAL_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "OFFICIAL_SUPABASE_ANON_KEY",
  );

  if (!anonKey) return null;

  const projectId =
    pickEnv("VITE_OFFICIAL_SUPABASE_PROJECT_ID", "VITE_SUPABASE_PROJECT_ID") ?? SUPABASE_PROJECT_ID;

  return { url, anonKey, projectId, source: "build" };
}
