"use client";

import { CheckCircle2 } from "lucide-react";
import { closeSessionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CloseSessionDialogProps = {
  sessionId: string;
  defaultAmount: number;
  defaultReminder?: string | null;
};

export function CloseSessionDialog({ sessionId, defaultAmount, defaultReminder }: CloseSessionDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Encerrar Sessão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Encerrar sessão</DialogTitle>
          <DialogDescription>Finalize em poucos campos e, se quiser, já agende o próximo encontro.</DialogDescription>
        </DialogHeader>
        <form action={closeSessionAction} className="space-y-4">
          <input type="hidden" name="sessionId" value={sessionId} />

          <div className="space-y-2">
            <Label htmlFor={`next-reminder-${sessionId}`}>O que fica para a próxima sessão?</Label>
            <Textarea
              id={`next-reminder-${sessionId}`}
              name="nextSessionReminder"
              placeholder="Ex: retomar tema X, revisar tarefa Y..."
              defaultValue={defaultReminder ?? ""}
            />
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-3 font-medium">Pagamento desta sessão</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`amount-${sessionId}`}>Valor (R$)</Label>
                <Input id={`amount-${sessionId}`} name="amount" type="number" min="0" step="0.01" defaultValue={defaultAmount} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`paymentStatus-${sessionId}`}>Status</Label>
                <select
                  id={`paymentStatus-${sessionId}`}
                  name="paymentStatus"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="PAID"
                >
                  <option value="PAID">Já foi pago</option>
                  <option value="PENDING">Ficou pendente</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`paymentMethod-${sessionId}`}>Forma</Label>
                <select
                  id={`paymentMethod-${sessionId}`}
                  name="paymentMethod"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="Pix"
                >
                  <option value="Pix">Pix</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-3 font-medium">Agendar próximo encontro? (opcional)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`nextDate-${sessionId}`}>Data</Label>
                <Input id={`nextDate-${sessionId}`} name="nextDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`nextTime-${sessionId}`}>Hora</Label>
                <Input id={`nextTime-${sessionId}`} name="nextTime" type="time" />
              </div>
            </div>
          </div>

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">Anotação breve da sessão (opcional)</summary>
            <Textarea className="mt-3" name="sessionNotes" placeholder="Resumo clínico curto..." />
          </details>

          <Button type="submit" className="w-full">
            Salvar encerramento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
