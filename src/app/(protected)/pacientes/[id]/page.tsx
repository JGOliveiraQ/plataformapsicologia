import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { updatePatientReminderAction } from "@/app/actions";
import { DeletePatientDialog } from "@/components/delete-patient-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PatientDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export const instant = false;

export default async function PatientDetailsPage({ params }: PatientDetailsPageProps) {
  await connection();
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
  });
  if (!patient) {
    notFound();
  }

  const [sessions, latestReminderSource] = await Promise.all([
    prisma.session.findMany({
      where: { patientId: id },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    }),
    prisma.session.findFirst({
      where: { patientId: id, nextSessionReminder: { not: null } },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    }),
  ]);

  const paidTotal = sessions
    .filter((session) => session.paymentStatus === "PAID")
    .reduce((acc, session) => acc + session.amount, 0);
  const pendingTotal = sessions
    .filter((session) => session.paymentStatus === "PENDING")
    .reduce((acc, session) => acc + session.amount, 0);

  return (
    <section className="space-y-4">
      <Link href="/pacientes" className="text-sm text-muted-foreground underline">
        ← Voltar para pacientes
      </Link>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">{patient.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{patient.phone}</p>
          </div>
          <DeletePatientDialog
            patientId={patient.id}
            patientName={patient.name}
            redirectTo="/pacientes"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">Valor padrão: {formatCurrency(patient.defaultSessionValue)}</p>
          {patient.notes ? <p className="rounded-md border p-2 text-sm">{patient.notes}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lembrete atual para o próximo atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePatientReminderAction} className="space-y-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <Textarea name="reminder" defaultValue={latestReminderSource?.nextSessionReminder ?? ""} />
            <Button type="submit">Salvar lembrete</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total já pago</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(paidTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pendente a receber</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">{formatCurrency(pendingTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total de sessões</p>
            <p className="mt-1 text-2xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de sessões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem histórico de sessões para este paciente.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{formatDate(session.date)} às {session.time}</p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      session.paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {session.paymentStatus === "PAID" ? "Pago" : "Pendente"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(session.amount)}
                  {session.paymentMethod ? ` • ${session.paymentMethod}` : ""}
                  {session.status === "COMPLETED" ? " • Realizada" : session.status === "CANCELED" ? " • Cancelada" : " • Agendada"}
                </p>
                {session.nextSessionReminder ? (
                  <p className="mt-1 rounded bg-accent/40 p-1.5 text-xs text-muted-foreground">
                    <strong>Lembrete combinado:</strong> {session.nextSessionReminder}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
