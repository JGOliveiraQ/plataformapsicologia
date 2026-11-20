"use client";

import { Plus } from "lucide-react";
import { createExpenseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PatientOption = {
  id: string;
  name: string;
};

type RegisterExpenseDialogProps = {
  patients: PatientOption[];
  initialDate: string;
  patientId?: string;
};

export function RegisterExpenseDialog({ patients, initialDate, patientId }: RegisterExpenseDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Gasto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo gasto</DialogTitle>
          <DialogDescription>Preencha somente o essencial.</DialogDescription>
        </DialogHeader>

        <form action={createExpenseAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">O que foi o gasto?</Label>
            <Input id="description" name="description" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" name="date" type="date" defaultValue={initialDate} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientId">Para qual paciente? (opcional)</Label>
            <select
              id="patientId"
              name="patientId"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={patientId ?? ""}
            >
              <option value="">Gasto Geral (Consultório)</option>
              {patients.map((patient) => (
                <option value={patient.id} key={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
          <Button className="w-full" type="submit">
            Salvar gasto
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
