import { endOfMonth, startOfMonth } from "date-fns";
import { connection } from "next/server";
import { markSessionPaidAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type FinanceiroPageProps = {
  searchParams: Promise<{
    modo?: "mes" | "geral";
    mes?: string;
    pendentes?: "1";
  }>;
};

export const instant = false;

function getMonthDate(monthYear?: string) {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    return new Date();
  }
  return new Date(`${monthYear}-01T12:00:00.000Z`);
}

export default async function FinanceiroPage({ searchParams }: FinanceiroPageProps) {
  await connection();
  const params = await searchParams;
  const mode = params.modo === "geral" ? "geral" : "mes";
  const pendingOnly = params.pendentes === "1";
  const monthDate = getMonthDate(params.mes);
  const monthInput = `${monthDate.getFullYear()}-${`${monthDate.getMonth() + 1}`.padStart(2, "0")}`;

  const dateFilter =
    mode === "mes"
      ? {
          gte: startOfMonth(monthDate),
          lte: endOfMonth(monthDate),
        }
      : undefined;

  const sessions = await prisma.session.findMany({
    where: {
      status: { not: "CANCELED" },
      date: dateFilter,
    },
    include: { patient: true },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });

  const totalReceived = sessions
    .filter((session) => session.paymentStatus === "PAID")
    .reduce((acc, session) => acc + session.amount, 0);
  const totalPending = sessions
    .filter((session) => session.paymentStatus === "PENDING")
    .reduce((acc, session) => acc + session.amount, 0);
  const totalGross = totalReceived + totalPending;
  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length;

  const visibleSessions = pendingOnly ? sessions.filter((session) => session.paymentStatus === "PENDING") : sessions;

  return (
    <section className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Período</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/financeiro?modo=mes&mes=${monthInput}${pendingOnly ? "&pendentes=1" : ""}`}
                className={`rounded-md border px-3 py-1.5 text-sm ${mode === "mes" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                Mês Atual
              </a>
              <a
                href={`/financeiro?modo=geral${pendingOnly ? "&pendentes=1" : ""}`}
                className={`rounded-md border px-3 py-1.5 text-sm ${mode === "geral" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                Tudo até agora
              </a>
            </div>
          </div>
          {mode === "mes" ? (
            <form method="get" className="flex items-end gap-2">
              <input type="hidden" name="modo" value="mes" />
              {pendingOnly ? <input type="hidden" name="pendentes" value="1" /> : null}
              <div className="space-y-1">
                <label htmlFor="mes" className="text-sm text-muted-foreground">
                  Mês/Ano
                </label>
                <input
                  id="mes"
                  name="mes"
                  type="month"
                  defaultValue={monthInput}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <Button variant="outline" type="submit">
                Aplicar
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Recebido</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(totalReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pendente a Receber</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Previsto</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sessões Realizadas</p>
            <p className="mt-1 text-2xl font-bold text-primary">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Sessões e Pagamentos</CardTitle>
          <a
            href={`/financeiro?modo=${mode}${mode === "mes" ? `&mes=${monthInput}` : ""}${pendingOnly ? "" : "&pendentes=1"}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            {pendingOnly ? "Mostrar todas as sessões" : "Mostrar apenas pendentes"}
          </a>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada neste filtro.</p>
          ) : (
            visibleSessions.map((session) => (
              <div key={session.id} className="rounded-lg border p-3">
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div>
                    <p className="font-semibold">{session.patient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(session.date)} às {session.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{formatCurrency(session.amount)}</p>
                    <Badge variant={session.paymentStatus === "PAID" ? "success" : "warning"}>
                      {session.paymentStatus === "PAID" ? "Pago" : "Pendente"}
                    </Badge>
                    {session.paymentStatus === "PENDING" ? (
                      <form action={markSessionPaidAction}>
                        <input type="hidden" name="sessionId" value={session.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Marcar como Pago
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
