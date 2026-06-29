// Middleware de server-function que valida o bearer token do request
// contra o Supabase OFICIAL e expõe um client com RLS do usuário logado.
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { requireServerSupabaseAnonConfig } from "./env";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const authHeader = getRequestHeader("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Response("Unauthorized: No authorization header provided", {
        status: 401,
      });
    }
    const token = authHeader.slice("Bearer ".length).trim();

    let url: string;
    let anonKey: string;
    try {
      ({ url, anonKey } = requireServerSupabaseAnonConfig());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Supabase not configured";
      throw new Response(message, { status: 500 });
    }

    const supabase = createClient(url, anonKey, {
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
