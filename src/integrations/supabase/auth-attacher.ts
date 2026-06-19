// Client-side server-fn middleware: attaches the current Supabase
// session bearer token to every server-function HTTP call so that
// `requireSupabaseAuth` can validate it server-side.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") {
      return next();
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return next();

    return next({
      headers: { authorization: `Bearer ${token}` },
    });
  },
);
