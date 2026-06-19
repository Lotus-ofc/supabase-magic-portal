// SERVER-ONLY admin client para o projeto OFICIAL (ywvhoctcmibjitvwkkhb).
// Usa OFFICIAL_SERVICE_ROLE_KEY (a service_role padrão do Supabase, renomeada
// porque o prefixo SUPABASE_ é reservado pela plataforma Lovable).
// NUNCA importe deste arquivo no client; o sufixo .server.ts bloqueia.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.OFFICIAL_SUPABASE_URL;
const SERVICE_ROLE = process.env.OFFICIAL_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error(
    "Missing OFFICIAL_SUPABASE_URL / OFFICIAL_SERVICE_ROLE_KEY env vars for admin client",
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
