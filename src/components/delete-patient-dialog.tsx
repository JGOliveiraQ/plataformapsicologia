"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePatient } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeletePatientDialogProps = {
  patientId: string;
  patientName: string;
  redirectTo?: string;
};

export function DeletePatientDialog({
  patientId,
  patientName,
  redirectTo,
}: DeletePatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deletePatient(patientId, redirectTo === "/pacientes");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 className="h-4 w-4" />
          <span>Excluir Paciente</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir Paciente</DialogTitle>
          <DialogDescription className="pt-2 text-base text-foreground">
            Tem certeza que deseja excluir o paciente <strong>{patientName}</strong>? Todas as sessões e históricos dele também serão apagados.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            type="button"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Excluindo..." : "Sim, excluir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
