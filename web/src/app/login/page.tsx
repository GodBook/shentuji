import { redirect } from "next/navigation";
import { AuthPortal } from "@/components/auth-portal";
import { getPageAuthState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const state = await getPageAuthState();
  if (!state.setup) redirect("/setup");
  if (state.authenticated) redirect("/");
  return <AuthPortal mode="login" />;
}
