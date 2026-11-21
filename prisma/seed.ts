import { PrismaClient, PaymentStatus, SessionStatus } from "@prisma/client";

const prisma = new PrismaClient();

function makeDate(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

async function main() {
  await prisma.expense.deleteMany();
  await prisma.session.deleteMany();
  await prisma.patient.deleteMany();

  const patient = await prisma.patient.create({
    data: {
      name: "Paciente Exemplo",
      phone: "11999998888",
      defaultSessionValue: 150,
      notes: "Paciente para testes de sistema.",
    },
  });

  await prisma.session.createMany({
    data: [
      {
        patientId: patient.id,
        date: makeDate("2026-11-20"),
        time: "10:00",
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        amount: 150,
      },
      {
        patientId: patient.id,
        date: makeDate("2026-11-21"),
        time: "14:00",
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        amount: 150,
      },
    ],
  });

  console.log("Seed finalizado com sucesso: 1 paciente e 2 sessões criados.");
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
