import { z } from "zod";

export const authSearchSchema = z.object({
  view: z.enum(["login", "set-password", "onboarding", "forgot-password", "link-error"]).optional(),
  context: z.enum(["invite", "recovery"]).optional(),
  error: z.string().optional(),
  redirect: z.string().optional(),
});

export type AuthSearch = z.infer<typeof authSearchSchema>;
export type AuthView = NonNullable<AuthSearch["view"]>;
export type SetPasswordContext = NonNullable<AuthSearch["context"]>;

export function resolveAuthView(search: AuthSearch): AuthView {
  return search.view ?? "login";
}

export function isSetPasswordView(view: AuthView): boolean {
  return view === "set-password";
}

export function isOnboardingView(view: AuthView): boolean {
  return view === "onboarding";
}
