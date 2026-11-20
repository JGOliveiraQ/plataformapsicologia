import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isAuthenticated } from "@/lib/auth";
export const instant = false;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; data?: string }>;
}) {
  await connection();
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  const params = searchParams ? await searchParams : {};
  const dateParam = params.date || params.data;
  redirect(dateParam ? `/agenda?date=${dateParam}` : "/agenda");
}
