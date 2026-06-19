// SERVER-ONLY admin client. Uses the service role key.
// NEVER import this from client code; the `.server.ts` extension blocks
// it from client bundles. Inside `*.functions.ts`, load with
// `const { supabaseAdmin } = await import("@/integrations/supabase/client.server")`.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars for admin client",
  );
}

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
