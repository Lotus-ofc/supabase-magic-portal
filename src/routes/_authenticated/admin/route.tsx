import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { isAdmin } = await checkIsAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  // Layout = somente <Outlet />. O shell e a navegação ficam em
  // `_authenticated/route.tsx`, evitando dupla camada de UI.
  component: () => <Outlet />,
});
