"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, DollarSign, LogOut, Users } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/pacientes", label: "Pacientes", icon: Users },
];

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const currentPath = usePathname();
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-3 py-4 sm:px-6">
      <header className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Organizador de Atendimentos</h1>
          <p className="text-sm text-muted-foreground">Fluxo rápido para agenda, pagamentos e pacientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={logoutAction}>
            <Button variant="outline" size="sm" className="gap-2" type="submit">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </form>
        </div>
      </header>

      <nav className="mb-6 grid grid-cols-3 gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active = currentPath.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
