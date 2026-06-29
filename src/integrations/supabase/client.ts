import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  resolveBuildTimeSupabaseConfig,
  SUPABASE_PROJECT_ID,
  type SupabasePublicConfig,
} from "./public-config";

let _client: SupabaseClient | null = null;
let _config: SupabasePublicConfig | null = null;

function createSupabaseClient(cfg: SupabasePublicConfig): SupabaseClient {
  return createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: true,
      detectSessionInUrl: typeof window !== "undefined",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: `sb-${cfg.projectId}-auth-token`,
    },
  });
}

/** Inicializa o client (build-time ou bootstrap runtime). Idempotente. */
export function initSupabaseClient(cfg: SupabasePublicConfig): SupabaseClient {
  if (_client && _config?.anonKey === cfg.anonKey && _config.url === cfg.url) {
    return _client;
  }
  _config = cfg;
  _client = createSupabaseClient(cfg);
  return _client;
}

export function isSupabaseReady(): boolean {
  return _client != null;
}

export function getSupabaseConfig(): SupabasePublicConfig | null {
  return _config;
}

/** Client Supabase — só use após `bootstrapSupabase()` ou init manual. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      throw new Error(
        "Supabase ainda não inicializado. Aguarde bootstrapSupabase() ou configure VITE_OFFICIAL_* no build.",
      );
    }
    const value = (_client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(_client) : value;
  },
});

/** Tenta build env; senão busca anon/url no servidor (runtime secrets Lovable). */
export async function bootstrapSupabase(): Promise<SupabasePublicConfig> {
  const build = resolveBuildTimeSupabaseConfig();
  if (build) {
    initSupabaseClient(build);
    return build;
  }

  const { getPublicSupabaseConfig } = await import("@/lib/supabase.functions");
  const remote = await getPublicSupabaseConfig();
  const cfg: SupabasePublicConfig = {
    url: remote.url,
    anonKey: remote.anonKey,
    projectId: remote.projectId ?? SUPABASE_PROJECT_ID,
    source: "runtime",
  };
  initSupabaseClient(cfg);
  return cfg;
}

/** @deprecated Use resolveBuildTimeSupabaseConfig — null quando anon não está no build. */
export const supabaseConfigError: string | null = resolveBuildTimeSupabaseConfig()
  ? null
  : "Anon key não embutida no build; tentando carregar via servidor…";
