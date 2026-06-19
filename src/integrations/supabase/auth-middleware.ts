// Middleware de server-function que valida o bearer token do request
// contra o Supabase OFICIAL e expõe um client com RLS do usuário logado.
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const authHeader = getRequestHeader("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Response("Unauthorized: No authorization header provided", {
        status: 401,
      });
    }
    const token = authHeader.slice("Bearer ".length).trim();

    const SUPABASE_URL = process.env.OFFICIAL_SUPABASE_URL!;
    const SUPABASE_ANON_KEY = process.env.OFFICIAL_SUPABASE_ANON_KEY!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new Response("Unauthorized: Invalid session", { status: 401 });
    }

    return next({
      context: {
        supabase,
        userId: data.user.id,
        claims: data.user,
      },
    });
  },
);
