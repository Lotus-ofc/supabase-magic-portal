/**
 * Envio de convites Supabase Auth com redirectTo explícito.
 * Somente servidor.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireServerSupabaseAnonConfig } from "@/integrations/supabase/env.server";
import { buildAuthInviteRedirectUrl, buildAuthCallbackUrl, normalizeAppUrl } from "@/lib/app-url";
import { resolveAuthInviteRedirectUrl, resolveServerAppUrl } from "@/lib/app-url.server";
import { recordInviteAudit } from "@/lib/infra/invite-audit";
import { recordInviteAccessAudit } from "@/features/access/access-audit.server";
import { ensureAccessAccountRow } from "@/lib/access.functions.server";
import { evaluateAuthDiagnostics } from "@/lib/infra/system-diagnostics.server";

export class AuthInviteError extends Error {
  readonly code: "invite_config" | "user_exists" | "invite_failed";

  constructor(message: string, code: "invite_config" | "user_exists" | "invite_failed") {
    super(message);
    this.name = "AuthInviteError";
    this.code = code;
  }
}

function isInviteConfigError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("redirect") ||
    m.includes("invalid url") ||
    m.includes("site url") ||
    m.includes("not allowed")
  );
}

function isUserAlreadyExists(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already") ||
    m.includes("registered") ||
    m.includes("exists") ||
    m.includes("duplicate")
  );
}

export interface AuthInviteResult {
  userId: string;
  redirectTo: string;
  appUrl: string;
}

async function assertCanSendInvites(clientOrigin?: string | null): Promise<{
  appUrl: string;
  redirectTo: string;
}> {
  const report = await evaluateAuthDiagnostics(clientOrigin);
  if (!report.invites_allowed) {
    throw new AuthInviteError(
      report.message ??
        report.block_invites_reason ??
        "Configuração de autenticação inválida para envio de convites.",
      "invite_config",
    );
  }
  const appUrl = report.app_url_configured
    ? normalizeAppUrl(report.app_url_configured)
    : resolveServerAppUrl();
  const redirectTo = buildAuthInviteRedirectUrl(appUrl);
  return { appUrl, redirectTo };
}

function auditFailure(
  params: {
    email: string;
    user_id?: string;
    action: "invite" | "resend";
    app_url: string;
    redirect_to: string;
  },
  error: string,
) {
  recordInviteAudit({ ...params, success: false, error });
  void recordInviteAccessAudit({ ...params, success: false, error });
}

export async function sendAuthInviteEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
  metadata?: { full_name?: string | null },
  clientOrigin?: string | null,
): Promise<AuthInviteResult> {
  const { appUrl, redirectTo } = await assertCanSendInvites(clientOrigin);

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: metadata?.full_name ? { full_name: metadata.full_name } : undefined,
  });

  if (error) {
    if (isInviteConfigError(error.message)) {
      const msg = `Link de convite rejeitado (${redirectTo}). Configure APP_URL no servidor e adicione esta URL em Supabase → Authentication → Redirect URLs. Detalhe: ${error.message}`;
      auditFailure({ email, action: "invite", app_url: appUrl, redirect_to: redirectTo }, msg);
      throw new AuthInviteError(msg, "invite_config");
    }
    if (isUserAlreadyExists(error.message)) {
      const msg = "Este e-mail já está cadastrado. Use “Reenviar e-mail” na lista de usuários.";
      auditFailure({ email, action: "invite", app_url: appUrl, redirect_to: redirectTo }, msg);
      throw new AuthInviteError(msg, "user_exists");
    }
    const msg = `Falha ao enviar convite por e-mail: ${error.message}`;
    auditFailure({ email, action: "invite", app_url: appUrl, redirect_to: redirectTo }, msg);
    throw new AuthInviteError(msg, "invite_failed");
  }

  const userId = data.user?.id;
  if (!userId) {
    const msg = "O Supabase não retornou o id do usuário após o convite.";
    auditFailure({ email, action: "invite", app_url: appUrl, redirect_to: redirectTo }, msg);
    throw new AuthInviteError(msg, "invite_failed");
  }

  recordInviteAudit({
    email,
    user_id: userId,
    action: "invite",
    app_url: appUrl,
    redirect_to: redirectTo,
    success: true,
  });
  void recordInviteAccessAudit({
    email,
    user_id: userId,
    action: "invite",
    app_url: appUrl,
    redirect_to: redirectTo,
    success: true,
  });
  void ensureAccessAccountRow(userId, "invite_pending");

  return { userId, redirectTo, appUrl };
}

async function resendViaGoTrue(email: string, redirectTo: string): Promise<boolean> {
  const { url, anonKey } = requireServerSupabaseAnonConfig();

  for (const type of ["signup", "invite"] as const) {
    const endpoint = new URL(`${url}/auth/v1/resend`);
    endpoint.searchParams.set("redirect_to", redirectTo);

    const res = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, type }),
    });

    if (res.ok) return true;
  }

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
  return !error;
}

/** Reenvia e-mail de convite/acesso para usuário já cadastrado (sem recriar conta). */
export async function resendAuthInviteEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
  userId: string,
  metadata?: { full_name?: string | null },
  clientOrigin?: string | null,
): Promise<AuthInviteResult> {
  const { appUrl, redirectTo } = await assertCanSendInvites(clientOrigin);

  const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: metadata?.full_name ? { full_name: metadata.full_name } : undefined,
  });

  if (!invited.error && invited.data.user?.id) {
    recordInviteAudit({
      email,
      user_id: invited.data.user.id,
      action: "resend",
      app_url: appUrl,
      redirect_to: redirectTo,
      success: true,
    });
    void recordInviteAccessAudit({
      email,
      user_id: invited.data.user.id,
      action: "resend",
      app_url: appUrl,
      redirect_to: redirectTo,
      success: true,
    });
    void ensureAccessAccountRow(invited.data.user.id, "invite_pending");
    return { userId: invited.data.user.id, redirectTo, appUrl };
  }

  if (invited.error) {
    if (isInviteConfigError(invited.error.message)) {
      const msg = `Link de convite rejeitado (${redirectTo}). Configure APP_URL e Redirect URLs no Supabase. Detalhe: ${invited.error.message}`;
      auditFailure(
        { email, user_id: userId, action: "resend", app_url: appUrl, redirect_to: redirectTo },
        msg,
      );
      throw new AuthInviteError(msg, "invite_config");
    }

    if (isUserAlreadyExists(invited.error.message)) {
      const resent = await resendViaGoTrue(email, redirectTo);
      if (resent) {
        recordInviteAudit({
          email,
          user_id: userId,
          action: "resend",
          app_url: appUrl,
          redirect_to: redirectTo,
          success: true,
        });
        void recordInviteAccessAudit({
          email,
          user_id: userId,
          action: "resend",
          app_url: appUrl,
          redirect_to: redirectTo,
          success: true,
        });
        void ensureAccessAccountRow(userId, "invite_pending");
        return { userId, redirectTo, appUrl };
      }
      const msg =
        "Não foi possível reenviar o e-mail. Verifique o endereço e tente novamente em alguns minutos.";
      auditFailure(
        { email, user_id: userId, action: "resend", app_url: appUrl, redirect_to: redirectTo },
        msg,
      );
      throw new AuthInviteError(msg, "invite_failed");
    }

    const msg = `Falha ao reenviar convite por e-mail: ${invited.error.message}`;
    auditFailure(
      { email, user_id: userId, action: "resend", app_url: appUrl, redirect_to: redirectTo },
      msg,
    );
    throw new AuthInviteError(msg, "invite_failed");
  }

  const msg = "Não foi possível reenviar o convite.";
  auditFailure(
    { email, user_id: userId, action: "resend", app_url: appUrl, redirect_to: redirectTo },
    msg,
  );
  throw new AuthInviteError(msg, "invite_failed");
}

/** Envia e-mail de recovery com redirect para /auth/callback. */
export async function sendPasswordResetEmail(
  email: string,
  clientOrigin?: string | null,
): Promise<{ redirectTo: string }> {
  const { appUrl } = await assertCanSendInvites(clientOrigin);
  const recoveryRedirect = buildAuthCallbackUrl(appUrl);

  const { url, anonKey } = requireServerSupabaseAnonConfig();
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo: recoveryRedirect,
  });
  if (error) {
    if (isInviteConfigError(error.message)) {
      throw new AuthInviteError(
        `Link de recovery rejeitado (${recoveryRedirect}). Adicione esta URL em Supabase → Redirect URLs. Detalhe: ${error.message}`,
        "invite_config",
      );
    }
    throw new AuthInviteError(
      `Falha ao enviar e-mail de recovery: ${error.message}`,
      "invite_failed",
    );
  }

  return { redirectTo: recoveryRedirect };
}
