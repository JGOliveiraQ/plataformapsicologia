import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/app-shell";
import { isAuthenticated } from "@/lib/auth";

export const instant = false;

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
