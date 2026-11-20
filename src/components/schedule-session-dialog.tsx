"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { scheduleSessionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PatientOption = {
  id: string;
  name: string;
  defaultSessionValue: number;
};

type ScheduleSessionDialogProps = {
  patients: PatientOption[];
  initialDate: string;
};

export function ScheduleSessionDialog({ patients, initialDate }: ScheduleSessionDialogProps) {
  const firstPatient = patients[0];
  const defaultPatientId = firstPatient?.id ?? "";
  const byId = useMemo(() => {
    return new Map(patients.map((patient) => [patient.id, patient]));
  }, [patients]);
  const [patientId, setPatientId] = useState(defaultPatientId);
  const [amount, setAmount] = useState(String(firstPatient?.defaultSessionValue ?? 0));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-11 gap-2 text-base">
          <Plus className="h-4 w-4" />
          Agendar Sessão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar sessão</DialogTitle>
          <DialogDescription>Escolha paciente, data, hora e ajuste o valor se necessário.</DialogDescription>
        </DialogHeader>
        <form action={scheduleSessionAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientId">Paciente</Label>
            <select
              id="patientId"
              name="patientId"
              required
              value={patientId}
              onChange={(event) => {
                const id = event.target.value;
                setPatientId(id);
                setAmount(String(byId.get(id)?.defaultSessionValue ?? 0));
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="date">Data</Label>
              <Input id="date" name="date" type="date" required defaultValue={initialDate} />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="time">Hora</Label>
              <Input id="time" name="time" type="time" required />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Salvar agendamento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
