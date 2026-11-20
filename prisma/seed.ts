import { PrismaClient, PaymentStatus, SessionStatus } from "@prisma/client";

const prisma = new PrismaClient();

function makeDate(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

async function main() {
  await prisma.expense.deleteMany();
  await prisma.session.deleteMany();
  await prisma.patient.deleteMany();

  const [ana, bruno, carla, diego, rosangela] = await Promise.all([
    prisma.patient.create({
      data: {
        name: "Ana Beatriz Souza",
        phone: "11988887777",
        defaultSessionValue: 180,
        notes: "Prefere horários de almoço e confirma por WhatsApp.",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Bruno Almeida",
        phone: "21997776655",
        defaultSessionValue: 220,
        notes: "Pode remarcar com frequência.",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Carla Menezes",
        phone: "31996665544",
        defaultSessionValue: 160,
        notes: "Paga quinzenalmente.",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Diego Martins",
        phone: "41995554433",
        defaultSessionValue: 200,
        notes: "Atendimentos noturnos.",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Rosângela de Albuquerque",
        phone: "11977778888",
        defaultSessionValue: 200,
        notes: "Atendimento semanal.",
      },
    }),
  ]);

  await prisma.session.createMany({
    data: [
      {
        patientId: ana.id,
        date: makeDate("2026-11-18"),
        time: "12:00",
        status: SessionStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: "Pix",
        amount: 180,
        nextSessionReminder: "Retomar exercício de respiração antes do expediente.",
        sessionNotes: "Boa evolução na rotina de autocuidado.",
      },
      {
        patientId: bruno.id,
        date: makeDate("2026-11-19"),
        time: "14:00",
        status: SessionStatus.COMPLETED,
        paymentStatus: PaymentStatus.PENDING,
        amount: 220,
        nextSessionReminder: "Revisar o diário de ansiedade.",
      },
      {
        patientId: rosangela.id,
        date: makeDate("2026-11-20"),
        time: "16:00",
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        amount: 200,
      },
      {
        patientId: carla.id,
        date: makeDate("2026-11-20"),
        time: "18:30",
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        amount: 160,
      },
      {
        patientId: diego.id,
        date: makeDate("2026-11-20"),
        time: "20:00",
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        amount: 210,
      },
      {
        patientId: ana.id,
        date: makeDate("2026-11-23"),
        time: "12:00",
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        amount: 190,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
