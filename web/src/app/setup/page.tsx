import { redirect } from "next/navigation";
import { AuthPortal } from "@/components/auth-portal";
import { getPageAuthState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const state = await getPageAuthState();
  if (state.setup) redirect(state.authenticated ? "/" : "/login");
  return <AuthPortal mode="setup" />;
}
