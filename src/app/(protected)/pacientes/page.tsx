import Link from "next/link";
import { connection } from "next/server";
import { createPatientAction } from "@/app/actions";
import { DeletePatientDialog } from "@/components/delete-patient-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function PacientesPage() {
  await connection();
  const patients = await prisma.patient.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { sessions: true },
      },
    },
  });

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr,1.3fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPatientAction} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="defaultSessionValue">Valor padrão da sessão (R$)</Label>
              <Input id="defaultSessionValue" name="defaultSessionValue" type="number" min="0" step="0.01" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Observações gerais (opcional)</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <Button className="w-full" type="submit">
              Cadastrar paciente
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pacientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum paciente cadastrado.</p>
          ) : (
            patients.map((patient) => (
              <div
                key={patient.id}
                className="flex flex-col justify-between gap-3 rounded-lg border p-3 transition sm:flex-row sm:items-center hover:border-primary/40"
              >
                <Link
                  href={`/pacientes/${patient.id}`}
                  className="flex-1 space-y-0.5"
                >
                  <p className="font-semibold text-foreground hover:underline">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">{patient.phone}</p>
                  <p className="text-sm">{formatCurrency(patient.defaultSessionValue)} por sessão</p>
                  <p className="text-xs text-muted-foreground">{patient._count.sessions} sessões registradas</p>
                </Link>
                <div className="flex items-center gap-2">
                  <Link href={`/pacientes/${patient.id}`}>
                    <Button variant="outline" size="sm">
                      Ver ficha
                    </Button>
                  </Link>
                  <DeletePatientDialog patientId={patient.id} patientName={patient.name} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
