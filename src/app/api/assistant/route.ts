import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs, tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import {
  executeConsultInformation,
  executeRegisterPayment,
  executeRegisterReminderOrEndSession,
  executeScheduleSession,
  findPatientFlexibly,
} from "@/lib/assistant-tools";

export const maxDuration = 30;

async function runFallback(message: string) {
  const lower = message.toLowerCase();
  const match =
    message.match(/(?:atendimento de|com a|com o|para a|para o|marca a|marca o|lembrete de|de)\s+([a-zA-ZÀ-ÿ\s]+?)(?:,|\.|\be ela\b|\be ele\b|\bdeixei\b|\bmarcar\b|\bàs\b|\bpara\b|$)/i) ||
    message.match(/([a-zA-ZÀ-ÿ]+(?:\s+[a-zA-ZÀ-ÿ]+){0,3})/i);

  const candidateName = match ? match[1].trim() : "";
  if (candidateName) {
    const search = await findPatientFlexibly(candidateName);
    if (search.found && search.patient) {
      const isPayment = lower.includes("pagou") || lower.includes("pago") || lower.includes("pix");
      const isEndSession = lower.includes("hoje") || lower.includes("atendimento") || lower.includes("sessão");
      const reminderMatch =
        message.match(/(?:atividade|tarefa|tema|lembrete|combinado)[:\s]+([^.]+)/i) ||
        message.match(/(?:deixei\s+(?:uma\s+)?atividade(?:\s+pra\s+ela|\s+pra\s+ele)?[:\s]+)(.+)/i);
      const reminderText = reminderMatch ? reminderMatch[1].trim() : undefined;

      await executeRegisterReminderOrEndSession({
        patientId: search.patient.id,
        lembrete: reminderText,
        encerrarSessaoHoje: isEndSession,
        statusPagamento: isPayment ? "PAID" : undefined,
        metodoPagamento: lower.includes("pix") ? "Pix" : undefined,
      });

      return {
        response: `OK, foi anotado lá para a próxima sessão de ${search.patient.name}! Qualquer coisa é só escrever mais algo que vou anotando.`,
        actionExecuted: true,
      };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let userMessage = "";
  try {
    const { message } = await req.json();
    userMessage = message;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Mensagem vazia ou inválida." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    let actionExecuted = false;

    // Fallback if no GEMINI_API_KEY is configured
    if (!apiKey) {
      const fallbackResult = await runFallback(message);
      if (fallbackResult) {
        return NextResponse.json(fallbackResult);
      }

      return NextResponse.json({
        response: "Chave GEMINI_API_KEY não configurada no arquivo .env. Por favor, adicione sua chave GEMINI_API_KEY para habilitar todas as funções do assistente.",
        actionExecuted: false,
      });
    }

    const google = createGoogleGenerativeAI({
      apiKey,
    });
    const model = google("gemini-3.8-flash");

    const todayDate = new Date();
    const formattedToday = todayDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const isoToday = todayDate.toISOString().slice(0, 10);

    const systemPrompt = `Você é o assistente pessoal inteligente de uma psicóloga em seu consultório.
Seu objetivo é processar comandos em linguagem natural (digitados ou falados por voz) e atualizar o sistema via ferramentas do Prisma.

CONTEXTO TEMPORAL ATUAL:
- Data de hoje: ${formattedToday} (${isoToday}).

DIRETRIZES E PERSONALIDADE:
- Respostas SEMPRE curtas, acolhedoras e objetivas em Português do Brasil.
- Tom profissional, leve e prestativo.
- Exemplo de resposta esperada: "OK, foi anotado lá para a próxima sessão de Rosângela de Albuquerque! Qualquer coisa é só escrever mais algo que vou anotando."
- Se a psicóloga apenas fizer uma pergunta ou consulta, responda de forma direta e concisa com base nos dados obtidos.

FLUXO DE AÇÕES:
1. Sempre busque o paciente primeiro com 'buscarPaciente(nome)'. Essa ferramenta é flexível e ignora acentos, maiúsculas e erros de digitação (ex: "rosangela de alboquerque" localiza "Rosângela de Albuquerque").
2. Se houver mais de um paciente encontrado com nomes parecidos e não estiver claro qual é, pergunte à psicóloga a qual deles ela se refere.
3. Se o paciente for identificado:
   - Se o texto indicar que o atendimento aconteceu hoje ou terminou (ex: "hoje no atendimento de...", "acabei de atender..."), chame 'registrarLembreteOuEncerrarSessao' com 'encerrarSessaoHoje: true'.
   - Se ela citar uma atividade, tarefa de casa ou tema combinado (ex: "deixei a atividade de ler o livro X"), passe isso no parâmetro 'lembrete'.
   - Se mencionar pagamento (ex: "ela já pagou no Pix", "pagamento feito em dinheiro"), atualize o status de pagamento para "PAID" e o método informado.
   - Se a intenção for agendar nova sessão futura (ex: "marca a Rosângela pra quinta-feira às 14h"), use 'agendarSessao' calculando a data correta a partir de hoje (${isoToday}).
   - Se a intenção for apenas consultar (ex: "quem está com pagamento pendente?", "o que deixei combinado com a Carla?"), use 'consultarInformacoes'.`;

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: message,
      tools: {
        buscarPaciente: tool({
          description:
            "Busca flexível de paciente no banco pelo nome, ignorando acentos, maiúsculas e pequenos erros de digitação.",
          inputSchema: z.object({
            nome: z.string().describe("Nome ou trecho do nome do paciente"),
          }),
          execute: async ({ nome }: { nome: string }) => {
            return await findPatientFlexibly(nome);
          },
        }),
        registrarLembreteOuEncerrarSessao: tool({
          description:
            "Encerra a sessão de hoje se ela tiver acontecido e/ou registra a atividade/lembrete combinado para a próxima sessão.",
          inputSchema: z.object({
            patientId: z.string().describe("ID do paciente"),
            lembrete: z
              .string()
              .optional()
              .describe("Atividade, tarefa ou tema combinado para a próxima sessão"),
            encerrarSessaoHoje: z
              .boolean()
              .optional()
              .describe("Se a sessão de hoje deve ser marcada como concluída (COMPLETED)"),
            statusPagamento: z
              .enum(["PAID", "PENDING"])
              .optional()
              .describe("Status de pagamento da sessão"),
            metodoPagamento: z
              .string()
              .optional()
              .describe("Método de pagamento informado (ex: Pix, Dinheiro, etc.)"),
            proximaData: z
              .string()
              .optional()
              .describe("Data da próxima sessão se agendada (YYYY-MM-DD)"),
            proximaHora: z
              .string()
              .optional()
              .describe("Hora da próxima sessão se agendada (HH:mm)"),
          }),
          execute: async (params: {
            patientId: string;
            lembrete?: string;
            encerrarSessaoHoje?: boolean;
            statusPagamento?: "PAID" | "PENDING";
            metodoPagamento?: string;
            proximaData?: string;
            proximaHora?: string;
          }) => {
            actionExecuted = true;
            return await executeRegisterReminderOrEndSession(params);
          },
        }),
        registrarPagamento: tool({
          description:
            "Marca a sessão mais recente ou pendente do paciente como paga (PAID) ou pendente (PENDING).",
          inputSchema: z.object({
            patientId: z.string().describe("ID do paciente"),
            status: z.enum(["PAID", "PENDING"]).describe("Status do pagamento"),
            metodo: z
              .string()
              .optional()
              .describe("Método de pagamento (Pix, Dinheiro, Transferência, etc.)"),
            sessionId: z
              .string()
              .optional()
              .describe("ID específico da sessão, se disponível"),
          }),
          execute: async (params: {
            patientId: string;
            status: "PAID" | "PENDING";
            metodo?: string;
            sessionId?: string;
          }) => {
            actionExecuted = true;
            return await executeRegisterPayment(params);
          },
        }),
        agendarSessao: tool({
          description: "Cria um novo agendamento de sessão para o paciente.",
          inputSchema: z.object({
            patientId: z.string().describe("ID do paciente"),
            data: z.string().describe("Data no formato YYYY-MM-DD"),
            hora: z.string().describe("Horário no formato HH:mm"),
            valor: z
              .number()
              .optional()
              .describe("Valor cobrado pela sessão em R$ (se omitido, usa o padrão do paciente)"),
          }),
          execute: async (params: {
            patientId: string;
            data: string;
            hora: string;
            valor?: number;
          }) => {
            actionExecuted = true;
            return await executeScheduleSession(params);
          },
        }),
        consultarInformacoes: tool({
          description:
            "Consulta dúvidas rápidas no banco de dados, como pagamentos pendentes, lembretes combinados ou próximas sessões.",
          inputSchema: z.object({
            tipo: z
              .enum(["pagamentos_pendentes", "lembrete_paciente", "proximas_sessoes", "geral"])
              .describe("Tipo de informação a consultar"),
            patientId: z.string().optional().describe("ID do paciente para consulta"),
          }),
          execute: async (params: {
            tipo: "pagamentos_pendentes" | "lembrete_paciente" | "proximas_sessoes" | "geral";
            patientId?: string;
          }) => {
            return await executeConsultInformation(params);
          },
        }),
      },
      stopWhen: stepCountIs(6),
    });

    return NextResponse.json({
      response: result.text || "OK, ação concluída!",
      actionExecuted,
    });
  } catch (error: any) {
    console.warn("Erro ao chamar o modelo Gemini, tentando fallback inteligente:", error?.message || error);
    if (userMessage) {
      try {
        const fallbackResult = await runFallback(userMessage);
        if (fallbackResult) {
          return NextResponse.json(fallbackResult);
        }
      } catch (fallbackError) {
        console.error("Erro no fallback:", fallbackError);
      }
    }

    return NextResponse.json(
      {
        error: "Ocorreu um erro ao processar sua mensagem.",
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
