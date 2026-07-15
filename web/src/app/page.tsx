import { redirect } from "next/navigation";
import { GalleryApp } from "@/components/gallery-app";
import { getPageAuthState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await getPageAuthState();
  if (!state.setup) redirect("/setup");
  if (!state.authenticated) redirect("/login");
  return <GalleryApp />;
}
