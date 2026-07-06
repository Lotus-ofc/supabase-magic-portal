import type { StackSnapshot } from "../types";
import pkg from "../../../../package.json";

const KEY_DEPS = [
  "@tanstack/react-start",
  "@tanstack/react-router",
  "@tanstack/react-query",
  "react",
  "zod",
  "@supabase/supabase-js",
  "vite",
  "tailwindcss",
];

export function buildStack(): StackSnapshot {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;

  const keyDependencies: Record<string, string> = {};
  for (const name of KEY_DEPS) {
    if (allDeps[name]) keyDependencies[name] = allDeps[name];
  }

  return {
    framework: [
      "TanStack Start (SSR + file-based routing)",
      "TanStack Router + React Query",
      "React 19",
    ],
    runtime: `Node ${pkg.engines?.node ?? ">=22"}`,
    keyDependencies,
    scripts: Object.keys(pkg.scripts ?? {}).filter((s) =>
      ["dev", "build", "check", "test", "lint"].includes(s),
    ),
  };
}
