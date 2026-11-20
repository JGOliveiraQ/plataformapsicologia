import Link from "next/link";
import { connection } from "next/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import { markSessionPaidAction } from "@/app/actions";
import { CloseSessionDialog } from "@/components/close-session-dialog";
import { QuickAssistantCard } from "@/components/quick-assistant-card";
import { ScheduleSessionDialog } from "@/components/schedule-session-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, normalizePhone } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type AgendaPageProps = {
  searchParams: Promise<{ date?: string; data?: string }>;
};

export const instant = false;

function parseLocalDate(dateStr?: string): Date {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
}

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  await connection();
  const params = await searchParams;
  const rawDate = params.date || params.data;
  const selectedDate = parseLocalDate(rawDate);
  const selectedDateStr = formatISODate(selectedDate);

  const prevDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1, 12, 0, 0);
  const nextDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1, 12, 0, 0);

  const today = new Date();
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
  const todayStr = formatISODate(todayNormalized);
  const yesterdayStr = formatISODate(
    new Date(todayNormalized.getFullYear(), todayNormalized.getMonth(), todayNormalized.getDate() - 1, 12, 0, 0),
  );
  const tomorrowStr = formatISODate(
    new Date(todayNormalized.getFullYear(), todayNormalized.getMonth(), todayNormalized.getDate() + 1, 12, 0, 0),
  );

  let relativeBadge: string | null = null;
  if (selectedDateStr === todayStr) {
    relativeBadge = "Hoje";
  } else if (selectedDateStr === yesterdayStr) {
    relativeBadge = "Ontem";
  } else if (selectedDateStr === tomorrowStr) {
    relativeBadge = "Amanhã";
  }

  const prevDateStr = formatISODate(prevDate);
  const nextDateStr = formatISODate(nextDate);

  const rawDayOfWeek = format(selectedDate, "EEEE", { locale: ptBR });
  const dayOfWeek = rawDayOfWeek.charAt(0).toUpperCase() + rawDayOfWeek.slice(1);
  const fullDateDisplay = `${dayOfWeek}, ${format(selectedDate, "dd/MM/yyyy")}`;

  const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);

  const [patients, sessions] = await Promise.all([
    prisma.patient.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultSessionValue: true },
    }),
    prisma.session.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        status: { not: "CANCELED" },
      },
      include: {
        patient: true,
      },
      orderBy: [{ time: "asc" }],
    }),
  ]);

  const patientIds = sessions.map((session) => session.patientId);
  const reminders = patientIds.length
    ? await prisma.session.findMany({
        where: {
          patientId: { in: patientIds },
          status: "COMPLETED",
          nextSessionReminder: { not: null },
          date: { lt: dayStart },
        },
        orderBy: [{ date: "desc" }, { time: "desc" }],
      })
    : [];

  const reminderByPatient = new Map<string, string>();
  for (const reminder of reminders) {
    if (!reminderByPatient.has(reminder.patientId) && reminder.nextSessionReminder) {
      reminderByPatient.set(reminder.patientId, reminder.nextSessionReminder);
    }
  }

  return (
    <section className="space-y-4">
      <QuickAssistantCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Agenda do Dia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <Link
                href={`/agenda?date=${prevDateStr}`}
                className="rounded-md border px-3 py-1.5 hover:bg-accent"
              >
                &lt; Dia anterior
              </Link>
              <Link
                href={`/agenda?date=${todayStr}`}
                className={`rounded-md border px-3 py-1.5 hover:bg-accent ${selectedDateStr === todayStr ? "bg-accent font-semibold" : ""}`}
              >
                Hoje
              </Link>
              <Link
                href={`/agenda?date=${nextDateStr}`}
                className="rounded-md border px-3 py-1.5 hover:bg-accent"
              >
                Próximo dia &gt;
              </Link>
            </div>
            <ScheduleSessionDialog patients={patients} initialDate={selectedDateStr} />
          </div>
          <form method="get" action="/agenda" className="flex max-w-xs items-end gap-2">
            <div className="w-full space-y-1">
              <label htmlFor="date" className="text-sm text-muted-foreground">
                Selecionar data
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={selectedDateStr}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <Button type="submit" variant="outline">
              Ir
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <p className="text-xl font-bold tracking-tight">{fullDateDisplay}</p>
        {relativeBadge ? (
          <Badge variant="secondary" className="text-xs font-semibold">
            {relativeBadge}
          </Badge>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">Nenhum atendimento para este dia.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const message = `Olá ${session.patient.name}, tudo bem? Passando para confirmar nossa sessão hoje às ${session.time}.`;
            const whatsapp = `https://wa.me/55${normalizePhone(session.patient.phone)}?text=${encodeURIComponent(message)}`;
            const reminder = reminderByPatient.get(session.patientId);
            return (
              <Card key={session.id}>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="text-xl font-bold">{session.time}</p>
                      <p className="text-lg font-medium">{session.patient.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(session.amount)}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant={session.paymentStatus === "PAID" ? "success" : "warning"}>
                        {session.paymentStatus === "PAID" ? "Pago" : "Pendente"}
                      </Badge>
                      {session.paymentStatus === "PENDING" ? (
                        <form action={markSessionPaidAction}>
                          <input type="hidden" name="sessionId" value={session.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Dar baixa
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a href={whatsapp} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </Button>
                    </a>
                  </div>

                  <div className="rounded-lg border bg-accent/40 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Para hoje / Ficou da última sessão</p>
                    <p className="text-sm">{reminder ?? "Sem lembrete anterior para este paciente."}</p>
                  </div>

                  <CloseSessionDialog sessionId={session.id} defaultAmount={session.amount} defaultReminder={session.nextSessionReminder} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
