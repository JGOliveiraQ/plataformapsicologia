"use server";

import { PaymentStatus, SessionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut, validatePassword } from "@/lib/auth";
import { parseCurrencyInput, parseDateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!validatePassword(password)) {
    redirect("/login?erro=1");
  }
  await signIn();
  redirect("/agenda");
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

export async function createPatientAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const defaultSessionValue = parseCurrencyInput(formData.get("defaultSessionValue"));

  if (!name || !phone || defaultSessionValue <= 0) {
    return;
  }

  await prisma.patient.create({
    data: {
      name,
      phone,
      defaultSessionValue,
      notes: notesRaw || null,
      active: true,
    },
  });

  revalidatePath("/pacientes");
}

export async function scheduleSessionAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const amount = parseCurrencyInput(formData.get("amount"));

  if (!patientId || !dateRaw || !time) {
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return;
  }

  await prisma.session.create({
    data: {
      patientId,
      date: parseDateInput(dateRaw),
      time,
      amount: amount > 0 ? amount : patient.defaultSessionValue,
      paymentStatus: PaymentStatus.PENDING,
      status: SessionStatus.SCHEDULED,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${patientId}`);
}

export async function closeSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const nextSessionReminderRaw = String(formData.get("nextSessionReminder") ?? "").trim();
  const sessionNotesRaw = String(formData.get("sessionNotes") ?? "").trim();
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "").trim();
  const paymentStatus = String(formData.get("paymentStatus") ?? "PENDING") as PaymentStatus;
  const nextDateRaw = String(formData.get("nextDate") ?? "").trim();
  const nextTimeRaw = String(formData.get("nextTime") ?? "").trim();
  const amount = parseCurrencyInput(formData.get("amount"));

  if (!sessionId || amount <= 0) {
    return;
  }

  const existing = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!existing) {
    return;
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.COMPLETED,
      amount,
      paymentStatus,
      paymentMethod: paymentStatus === PaymentStatus.PAID ? paymentMethodRaw || "Não informado" : null,
      nextSessionReminder: nextSessionReminderRaw || null,
      sessionNotes: sessionNotesRaw || null,
    },
  });

  if (nextDateRaw && nextTimeRaw) {
    await prisma.session.create({
      data: {
        patientId: existing.patientId,
        date: parseDateInput(nextDateRaw),
        time: nextTimeRaw,
        amount,
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
      },
    });
  }

  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${existing.patientId}`);
}

export async function markSessionPaidAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) {
    return;
  }

  const session = await prisma.session.update({
    where: { id: sessionId },
    data: {
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: "Pix",
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${session.patientId}`);
}

export async function createExpenseAction(formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseCurrencyInput(formData.get("amount"));
  const dateRaw = String(formData.get("date") ?? "");
  const patientIdRaw = String(formData.get("patientId") ?? "");

  if (!description || !dateRaw || amount <= 0) {
    return;
  }

  await prisma.expense.create({
    data: {
      description,
      amount,
      date: parseDateInput(dateRaw),
      patientId: patientIdRaw || null,
    },
  });

  revalidatePath("/financeiro");
  revalidatePath("/pacientes");
  if (patientIdRaw) {
    revalidatePath(`/pacientes/${patientIdRaw}`);
  }
}

export async function updatePatientReminderAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const reminderRaw = String(formData.get("reminder") ?? "").trim();
  if (!patientId) {
    return;
  }

  const latestSession = await prisma.session.findFirst({
    where: { patientId },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
  if (!latestSession) {
    return;
  }

  await prisma.session.update({
    where: { id: latestSession.id },
    data: { nextSessionReminder: reminderRaw || null },
  });

  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/agenda");
}

export async function deletePatient(patientId: string, shouldRedirect = false) {
  if (!patientId) {
    return;
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { patientId } }),
    prisma.expense.deleteMany({ where: { patientId } }),
    prisma.patient.delete({ where: { id: patientId } }),
  ]);

  revalidatePath("/pacientes");
  revalidatePath("/agenda");
  revalidatePath("/financeiro");

  if (shouldRedirect) {
    redirect("/pacientes");
  }
}

export async function deletePatientAction(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  if (!patientId) {
    return;
  }
  await deletePatient(patientId, redirectTo === "/pacientes");
}

