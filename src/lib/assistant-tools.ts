import { revalidatePath } from "next/cache";
import { PaymentStatus, SessionStatus } from "@prisma/client";
import { parseDateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (!an) return bn;
  if (!bn) return an;
  const matrix: number[][] = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let i = 0; i <= bn; i++) matrix[i][0] = i;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[bn][an];
}

export function calculateSimilarity(query: string, target: string): number {
  const q = normalizeText(query);
  const t = normalizeText(target);
  if (!q || !t) return 0;
  if (q === t) return 1.0;
  if (t.includes(q) || q.includes(t)) return 0.95;

  const qWords = q.split(/\s+/).filter((w) => w.length > 2);
  const tWords = t.split(/\s+/).filter((w) => w.length > 2);

  let matched = 0;
  for (const qw of qWords) {
    if (tWords.some((tw) => tw === qw || levenshteinDistance(qw, tw) <= 2)) {
      matched++;
    }
  }
  const tokenScore = qWords.length ? matched / qWords.length : 0;
  const dist = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  const distScore = 1 - dist / maxLen;

  return Math.max(tokenScore, distScore);
}

export async function findPatientFlexibly(queryName: string) {
  const patients = await prisma.patient.findMany({
    where: { active: true },
    select: { id: true, name: true, phone: true, defaultSessionValue: true },
  });

  const scored = patients
    .map((patient) => ({
      patient,
      score: calculateSimilarity(queryName, patient.name),
    }))
    .filter((item) => item.score >= 0.55)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      found: false,
      single: false,
      candidates: [],
      message: `Nenhum paciente encontrado com nome parecido com "${queryName}".`,
    };
  }

  const top = scored[0];
  const second = scored[1];

  // If top candidate is confident and clearly ahead or alone
  if (top.score >= 0.75 && (!second || top.score - second.score >= 0.2)) {
    return {
      found: true,
      single: true,
      patient: top.patient,
      candidates: [top.patient],
    };
  }

  // If multiple candidates have similar high scores
  return {
    found: true,
    single: false,
    patient: top.patient,
    candidates: scored.slice(0, 3).map((s) => s.patient),
    message: `Encontrei mais de um paciente com nome parecido.`,
  };
}

export async function executeRegisterReminderOrEndSession({
  patientId,
  lembrete,
  encerrarSessaoHoje,
  statusPagamento,
  metodoPagamento,
  proximaData,
  proximaHora,
}: {
  patientId: string;
  lembrete?: string;
  encerrarSessaoHoje?: boolean;
  statusPagamento?: "PAID" | "PENDING";
  metodoPagamento?: string;
  proximaData?: string;
  proximaHora?: string;
}) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new Error(`Paciente com ID ${patientId} não encontrado.`);
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1. Check if today's session exists
  let todaySession = await prisma.session.findFirst({
    where: {
      patientId,
      date: { gte: dayStart, lte: dayEnd },
      status: { not: SessionStatus.CANCELED },
    },
  });

  if (encerrarSessaoHoje) {
    if (todaySession) {
      todaySession = await prisma.session.update({
        where: { id: todaySession.id },
        data: {
          status: SessionStatus.COMPLETED,
          paymentStatus: statusPagamento
            ? statusPagamento === "PAID"
              ? PaymentStatus.PAID
              : PaymentStatus.PENDING
            : todaySession.paymentStatus,
          paymentMethod:
            statusPagamento === "PAID"
              ? metodoPagamento || "Pix"
              : todaySession.paymentMethod,
          nextSessionReminder: lembrete || todaySession.nextSessionReminder,
        },
      });
    } else {
      // Create completed session for today
      todaySession = await prisma.session.create({
        data: {
          patientId,
          date: dayStart,
          time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
          amount: patient.defaultSessionValue,
          status: SessionStatus.COMPLETED,
          paymentStatus:
            statusPagamento === "PAID" ? PaymentStatus.PAID : PaymentStatus.PENDING,
          paymentMethod: statusPagamento === "PAID" ? metodoPagamento || "Pix" : null,
          nextSessionReminder: lembrete || null,
        },
      });
    }
  }

  // 2. Handle next session reminder
  if (lembrete) {
    // Check if next scheduled session exists
    const nextSession = await prisma.session.findFirst({
      where: {
        patientId,
        date: { gte: dayStart },
        status: SessionStatus.SCHEDULED,
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    if (nextSession) {
      await prisma.session.update({
        where: { id: nextSession.id },
        data: { nextSessionReminder: lembrete },
      });
    }

    // Also update on today's session or latest session so it is preserved
    if (todaySession) {
      await prisma.session.update({
        where: { id: todaySession.id },
        data: { nextSessionReminder: lembrete },
      });
    } else {
      const latestSession = await prisma.session.findFirst({
        where: { patientId },
        orderBy: [{ date: "desc" }, { time: "desc" }],
      });
      if (latestSession) {
        await prisma.session.update({
          where: { id: latestSession.id },
          data: { nextSessionReminder: lembrete },
        });
      }
    }
  }

  // 3. Optional: schedule next session if date/time provided
  if (proximaData && proximaHora) {
    await prisma.session.create({
      data: {
        patientId,
        date: parseDateInput(proximaData),
        time: proximaHora,
        amount: patient.defaultSessionValue,
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        nextSessionReminder: lembrete || null,
      },
    });
  }

  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${patientId}`);

  return {
    success: true,
    patientName: patient.name,
    sessionCompleted: Boolean(encerrarSessaoHoje),
    reminderSaved: Boolean(lembrete),
  };
}

export async function executeRegisterPayment({
  patientId,
  status,
  metodo,
  sessionId,
}: {
  patientId: string;
  status: "PAID" | "PENDING";
  metodo?: string;
  sessionId?: string;
}) {
  let targetSessionId = sessionId;

  if (!targetSessionId) {
    // Find pending session first, or latest session
    const pendingSession = await prisma.session.findFirst({
      where: {
        patientId,
        paymentStatus: PaymentStatus.PENDING,
        status: { not: SessionStatus.CANCELED },
      },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });

    if (pendingSession) {
      targetSessionId = pendingSession.id;
    } else {
      const latest = await prisma.session.findFirst({
        where: { patientId },
        orderBy: [{ date: "desc" }, { time: "desc" }],
      });
      if (latest) {
        targetSessionId = latest.id;
      }
    }
  }

  if (!targetSessionId) {
    throw new Error("Nenhuma sessão encontrada para registrar pagamento deste paciente.");
  }

  const updated = await prisma.session.update({
    where: { id: targetSessionId },
    data: {
      paymentStatus: status === "PAID" ? PaymentStatus.PAID : PaymentStatus.PENDING,
      paymentMethod: status === "PAID" ? metodo || "Pix" : null,
    },
    include: { patient: true },
  });

  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${patientId}`);

  return {
    success: true,
    sessionId: updated.id,
    patientName: updated.patient.name,
    paymentStatus: updated.paymentStatus,
    amount: updated.amount,
  };
}

export async function executeScheduleSession({
  patientId,
  data,
  hora,
  valor,
}: {
  patientId: string;
  data: string;
  hora: string;
  valor?: number;
}) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new Error(`Paciente com ID ${patientId} não encontrado.`);
  }

  const session = await prisma.session.create({
    data: {
      patientId,
      date: parseDateInput(data),
      time: hora,
      amount: valor && valor > 0 ? valor : patient.defaultSessionValue,
      status: SessionStatus.SCHEDULED,
      paymentStatus: PaymentStatus.PENDING,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${patientId}`);

  return {
    success: true,
    sessionId: session.id,
    patientName: patient.name,
    date: data,
    time: hora,
    amount: session.amount,
  };
}

export async function executeConsultInformation({
  tipo,
  patientId,
}: {
  tipo: "pagamentos_pendentes" | "lembrete_paciente" | "proximas_sessoes" | "geral";
  patientId?: string;
}) {
  if (tipo === "pagamentos_pendentes") {
    const pendings = await prisma.session.findMany({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        status: { not: SessionStatus.CANCELED },
      },
      include: { patient: true },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 20,
    });
    return {
      totalPendentes: pendings.length,
      sessoes: pendings.map((s) => ({
        paciente: s.patient.name,
        data: s.date.toISOString().slice(0, 10),
        hora: s.time,
        valor: s.amount,
      })),
    };
  }

  if (tipo === "lembrete_paciente" && patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    const latestWithReminder = await prisma.session.findFirst({
      where: {
        patientId,
        nextSessionReminder: { not: null },
      },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });
    return {
      paciente: patient?.name,
      lembrete: latestWithReminder?.nextSessionReminder ?? "Nenhum lembrete registrado.",
    };
  }

  if (tipo === "proximas_sessoes") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = await prisma.session.findMany({
      where: {
        date: { gte: today },
        status: SessionStatus.SCHEDULED,
      },
      include: { patient: true },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 10,
    });
    return {
      proximasSessoes: upcoming.map((s) => ({
        paciente: s.patient.name,
        data: s.date.toISOString().slice(0, 10),
        hora: s.time,
      })),
    };
  }

  return { mensagem: "Consulta concluída." };
}
