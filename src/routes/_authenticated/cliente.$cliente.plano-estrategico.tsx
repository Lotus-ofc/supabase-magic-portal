import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/plano-estrategico")({
  component: () => <Outlet />,
});
