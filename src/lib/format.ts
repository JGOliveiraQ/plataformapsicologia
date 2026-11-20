import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number) {
  return moneyFormatter.format(value);
}

export function formatDate(date: Date, pattern = "dd/MM/yyyy") {
  return format(date, pattern, { locale: ptBR });
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseCurrencyInput(raw: FormDataEntryValue | null) {
  if (!raw) return 0;
  return Number.parseFloat(String(raw)) || 0;
}

export function parseDateInput(raw: string) {
  return new Date(`${raw}T12:00:00.000Z`);
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}
