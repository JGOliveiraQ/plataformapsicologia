"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mic, MicOff, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function QuickAssistantCard() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  function toggleRecording() {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("O seu navegador não possui suporte para a Web Speech API de reconhecimento de voz.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setMessage((prev) => {
            const trimmed = prev.trim();
            if (!trimmed) return currentTranscript.trim();
            // If already ends with current transcript piece, avoid repeating
            return `${trimmed} ${currentTranscript.trim()}`;
          });
        }
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Falha ao iniciar reconhecimento de voz:", err);
      setIsRecording(false);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const textToSend = message.trim();
    if (!textToSend || loading) return;

    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Erro ao consultar o assistente.");
      }

      setResponse(data.response);
      setMessage("");

      if (data.actionExecuted) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao processar seu pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-lg">Anotação Rápida com Assistente</CardTitle>
            <CardDescription className="text-xs">
              Dite ou digite o que aconteceu na sessão para registrar lembretes, pagamentos e agendamentos automaticamente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ex: Hoje com a Rosângela deixei a atividade de ler o livro X e ela já pagou no Pix..."
            className="min-h-[85px] resize-y bg-background text-sm"
            disabled={loading}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={toggleRecording}
              className={`gap-1.5 transition-all ${
                isRecording ? "animate-pulse font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  <span>Ouvindo... (clique para parar)</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  <span>Gravar voz</span>
                </>
              )}
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={loading || !message.trim()}
              className="gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Enviar</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {response ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 text-sm text-emerald-900 animate-in fade-in">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="font-medium text-emerald-950">Assistente:</p>
              <p className="mt-0.5 leading-relaxed">{response}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 animate-in fade-in">
            <p className="font-medium">Não foi possível processar:</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
