/** Expõe URL + anon key do runtime server (Lovable secrets). Sem auth — dados são públicos (RLS). */
import { createServerFn } from "@tanstack/react-start";
import { getServerSupabaseAnonKey, getServerSupabaseUrl } from "@/integrations/supabase/env.server";
import { SUPABASE_DEFAULT_URL, SUPABASE_PROJECT_ID } from "@/integrations/supabase/public-config";

export const getPublicSupabaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  const url = getServerSupabaseUrl() ?? SUPABASE_DEFAULT_URL;
  const anonKey = getServerSupabaseAnonKey();

  if (!anonKey) {
    throw new Error(
      "Supabase anon key ausente no servidor. Configure OFFICIAL_SUPABASE_ANON_KEY ou VITE_OFFICIAL_SUPABASE_ANON_KEY nos secrets do Lovable.",
    );
  }

  return {
    url,
    anonKey,
    projectId: SUPABASE_PROJECT_ID,
  };
});
