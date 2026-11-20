"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProtectedErrorProps = {
  error: Error;
  reset: () => void;
};

export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
  const isDbError =
    error.message.includes("PrismaClientInitializationError") ||
    error.message.includes("Can't reach database server") ||
    error.message.includes("DATABASE_URL");

  return (
    <main className="mx-auto w-full max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>{isDbError ? "Banco de dados indisponível" : "Erro ao carregar a página"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDbError ? (
            <p className="text-sm text-muted-foreground">
              Configure a variável <strong>DATABASE_URL</strong> com um PostgreSQL válido (Supabase/Neon) e rode as migrações + seed.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Ocorreu um erro inesperado ao carregar os dados.</p>
          )}
          <Button onClick={reset} variant="outline">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
