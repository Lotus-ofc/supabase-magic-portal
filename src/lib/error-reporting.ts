import { BRAND_NAME } from "./brand";

type ErrorReporterOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEventsBridge = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ErrorReporterOptions,
  ) => void;
};

declare global {
  interface Window {
    /** Bridge transitório enquanto Lovable permanece no pipeline de deploy. */
    __lovableEvents?: LovableEventsBridge;
  }
}

/**
 * Reporta erros do client para observabilidade.
 * Hoje: console (dev) + bridge Lovable (transitório).
 * Futuro: Sentry / Datadog — plugar aqui sem alterar boundaries.
 */
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    source: "react_error_boundary",
    route: window.location.pathname,
    ...context,
  };

  if (import.meta.env.DEV) {
    console.error(`[${BRAND_NAME}]`, error, payload);
  }

  window.__lovableEvents?.captureException?.(error, payload, {
    mechanism: "react_error_boundary",
    handled: false,
    severity: "error",
  });
}
