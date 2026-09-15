import { createFileRoute, redirect } from "@tanstack/react-router";
import { tokenStore } from "../lib/api";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const token = tokenStore.get();
    if (token) {
      throw redirect({ to: "/dashboard" });
    } else {
      throw redirect({ to: "/login" });
    }
  },
  component: Index,
});

function Index() {
  return null;
}
