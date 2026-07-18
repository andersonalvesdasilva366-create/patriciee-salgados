import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { brl, formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { CalendarClock, Check, Clock, Copy, MessageCircle, Package, RefreshCcw, Send, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

const PIX_PAYLOAD = "pix";

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({ meta: [{ title: "Status do pedido — Salgados da Paty" }] }),
  component: OrderStatusPage,
});

const STEPS: { key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "recebido", label: "Pedido Recebido", icon: Check },
  { key: "encomendado", label: "Encomendado", icon: Package },
  { key: "agendado", label: "Agendado", icon: Clock },
  { key: "enviado", label: "Enviado", icon: Truck },
];

function OrderStatusPage() {
  const { id } = useParams({ from: "/pedido/$id" });
  const { orders, submitOrderFeedback, refreshOrderStatus } = useStore();
  const order = orders.find((o) => o.id === id);
  const [feedback, setFeedback] = useState(order?.feedback ?? "");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [countdownLabel, setCountdownLabel] = useState("45:00");
  const [qrExpired, setQrExpired] = useState(false);
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(order?.createdAt ?? null);

  useEffect(() => {
    // PIX is now static and always valid, no countdown needed
    setQrExpired(false);
    setCountdownLabel("Sempre válido");
  }, [order]);

  useEffect(() => {
    if (!order?.id) return;

    let cancelled = false;
    const syncOrder = async () => {
      setRefreshing(true);
      try {
        await refreshOrderStatus(order.id);
        if (!cancelled) {
          setLastUpdatedAt(new Date().toISOString());
        }
      } finally {
        if (!cancelled) {
          setRefreshing(false);
        }
      }
    };

    void syncOrder();
    if (typeof window !== "undefined") {
      const timer = window.setInterval(() => {
        void syncOrder();
      }, 10000);

      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [order?.id]);

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Pedido não encontrado</h1>
        <Link to="/produtos" className="mt-4 inline-block text-primary hover:underline">
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === order.status);
  const currentStep = currentIndex >= 0 ? STEPS[currentIndex] : STEPS[0];
  const pixPayload = PIX_PAYLOAD;

  const whatsappUrl = `https://wa.me/5541997474516?text=${encodeURIComponent(`Olá! Gostaria de tirar uma dúvida sobre o pedido ${order.orderCode} 😊`)}`;
  const adminWhatsappUrl = `https://wa.me/5541997474516?text=${encodeURIComponent(`Olá, Anderson! Vim pelo site e gostaria de falar sobre meu pedido ${order.orderCode} ou tirar mais informações sobre os salgados da Paty.`)}`;
  const shouldShowAdminMessage = Boolean(order.adminMessage && ["agendado", "enviado"].includes(order.status));
  const statusMessage = order.status === "enviado"
    ? "Seu pedido já foi entregue. Conta pra gente como foi a experiência?"
    : order.status === "agendado"
      ? "Seu pedido está programado para a data escolhida e já está pronto para a entrega."
      : order.status === "encomendado"
        ? "Sua encomenda já está sendo preparada com carinho."
        : "Seu pedido foi recebido e logo começaremos a organizar tudo.";
  const estimatedDelivery = order.scheduledAt
    ? formatDateTime(order.scheduledAt)
    : order.status === "encomendado"
      ? "Em breve"
      : order.status === "agendado"
        ? "Confirmando horário"
        : "A definir";
  const deliveryEvents = [
    { title: "Pedido recebido", description: "Seu pedido foi registrado com sucesso.", time: formatDateTime(order.createdAt) },
    { title: "Em preparação", description: "Nossa equipe está montando seu pedido com carinho.", time: order.status === "recebido" ? "Em andamento" : "Concluído" },
    { title: "Agendamento", description: order.scheduledAt ? `Entrega programada para ${formatDateTime(order.scheduledAt)}.` : "Aguardando confirmação de horário.", time: order.scheduledAt ? "Programado" : "Pendente" },
    { title: "Entregue", description: order.status === "enviado" ? "Pedido entregue com sucesso." : "Aguardando finalização da entrega.", time: order.status === "enviado" ? "Concluído" : "Pendente" },
  ];

  const copyPixKey = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pixPayload);
      }
      setCopiedPixKey(true);
      toast.success("Código Pix copiado!");
      if (typeof window !== "undefined") {
        window.setTimeout(() => setCopiedPixKey(false), 2000);
      }
    } catch {
      toast.error("Não foi possível copiar o código Pix");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-border/60 bg-card p-8 text-center shadow-warm duration-500">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-warm text-primary-foreground shadow-warm">
          <Send className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold">Obrigado pelo seu pedido!</h1>
        <p className="mt-2 text-muted-foreground">
          Sua encomenda foi registrada com sucesso.<br />
          Agora é só aguardar que iremos preparar tudo com muito carinho ❤️
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:justify-center">
          <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-primary/30 shadow-sm">
            Pedido {order.orderCode}
          </div>
          <span className="text-xs text-muted-foreground">Registrado em {formatDateTime(order.createdAt)}</span>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Pagamento por Pix</h2>
            <p className="mt-1 text-sm text-muted-foreground">Escaneie o QR Code ou copie a chave Pix abaixo e insira o valor <strong>{brl(order.total)}</strong> no app do seu banco.</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-sm font-medium ${qrExpired ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
            {qrExpired ? "QR expirado" : "Sempre válido"}
          </div>
        </div>

        {paymentConfirmed ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="font-semibold text-emerald-700">Obrigado! O pagamento foi confirmado.</p>
            <p className="mt-2 text-sm text-muted-foreground">Acompanhe o andamento do pedido aqui no site e fique de olho nas próximas etapas da preparação da sua encomenda.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center rounded-2xl border border-border/60 bg-secondary/40 p-4">
              <div className="rounded-2xl bg-white p-3">
                <QRCodeSVG value={pixPayload} size={192} level="M" includeMargin={true} />
              </div>
              <p className="mt-3 text-center text-sm text-muted-foreground">Abra o app do seu banco e escaneie este QR Code. Você inserirá o valor na sequência.</p>
              <p className="mt-2 text-center text-xs text-muted-foreground">Valor a pagar: <span className="font-bold text-foreground">{brl(order.total)}</span></p>
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Pix copia e cola</p>
                <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 shadow-sm sm:flex-row sm:items-start">
                  <Textarea
                    readOnly
                    value={pixPayload}
                    className="min-h-[220px] w-full resize-none border border-dashed border-primary/20 bg-background/80 p-3 font-mono text-[10px] leading-5 text-foreground shadow-inner focus-visible:ring-0 sm:text-sm"
                  />
                  <Button type="button" className="h-11 w-full shrink-0 rounded-full bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90 sm:w-11 sm:px-0" onClick={copyPixKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Você também pode copiar o código Pix acima e pagar digitando no seu banco. Não esqueça de inserir o valor de <strong>{brl(order.total)}</strong>.</p>
              </div>
              <Button className="mt-4 rounded-full" onClick={() => { setPaymentConfirmed(true); toast.success("Pagamento confirmado. Obrigado pela compra!"); }}>
                Já fiz o pagamento
              </Button>
            </div>
          </div>
        )}
      </div>

      {shouldShowAdminMessage && (
        <div className="mt-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <CalendarClock className="h-4 w-4" />
            Mensagem da Paty
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-800">{order.adminMessage}</p>
          <a
            href={adminWhatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com o Anderson no WhatsApp
          </a>
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Acompanhamento do pedido</h2>
            <p className="mt-1 text-sm text-muted-foreground">Atualização em tempo real do andamento da sua encomenda.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-sm text-muted-foreground">
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Atualizando..." : "Em tempo real"}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Etapa atual</p>
              <p className="mt-1 text-lg font-semibold">{currentStep.label}</p>
            </div>
            <div className="rounded-full bg-background/80 px-3 py-1 text-sm text-muted-foreground">
              {lastUpdatedAt ? `Atualizado ${formatDateTime(lastUpdatedAt)}` : "Aguardando atualização"}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{statusMessage}</p>
        </div>

        <ol className="mt-6 space-y-4">
          {STEPS.map((step, idx) => {
            const done = idx <= currentIndex;
            const active = idx === currentIndex;
            return (
              <li key={step.key} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background/70 p-3">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  <step.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", active && "text-primary")}>{step.label}</p>
                  {step.key === "agendado" && order.scheduledAt && done && (
                    <p className="text-sm text-muted-foreground">
                      Para {formatDateTime(order.scheduledAt)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Resumo do pedido</h2>
            <p className="mt-1 text-sm text-muted-foreground">Veja os detalhes e o que já foi preparado para você.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            Entrega prevista: {estimatedDelivery}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <h3 className="font-semibold">Histórico de eventos</h3>
            <ol className="mt-4 space-y-3">
              {deliveryEvents.map((event, idx) => (
                <li key={event.title} className="flex gap-3">
                  <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", idx === 0 ? "bg-primary" : "bg-border")}></span>
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <h3 className="font-semibold">Detalhes</h3>
            <dl className="mt-4 grid gap-2 text-sm">
              <div><dt className="text-muted-foreground">Cliente</dt><dd className="font-medium">{order.customerName}</dd></div>
              <div><dt className="text-muted-foreground">Whatsapp</dt><dd className="font-medium">{order.whatsapp}</dd></div>
              {order.notes && (
                <div>
                  <dt className="text-muted-foreground">Observações</dt>
                  <dd className="font-medium">{order.notes}</dd>
                </div>
              )}
            </dl>
            <ul className="mt-6 divide-y divide-border">
              {order.items.map((i) => (
                <li key={i.productId} className="flex justify-between py-2 text-sm">
                  <span>{i.name} × {i.quantity}</span>
                  <span className="font-medium">{brl(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{brl(order.total)}</span>
            </div>
          </div>
        </div>

        {order.status === "enviado" && (
          <div className="mt-6 rounded-3xl border border-border/60 bg-muted/5 p-5">
            <h2 className="font-display text-xl font-bold">Feedback da entrega</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Seu pedido já foi entregue. Conte como foi a experiência para a Paty melhorar cada vez mais.
            </p>
            {order.feedback ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                <p className="font-semibold">Feedback enviado</p>
                <p className="mt-1 whitespace-pre-line">{order.feedback}</p>
              </div>
            ) : (
              <>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Escreva seu feedback aqui..."
                  className="mt-4 min-h-[120px] rounded-3xl"
                />
                <Button
                  className="mt-4 rounded-full"
                  disabled={savingFeedback || !feedback.trim()}
                  onClick={async () => {
                    setSavingFeedback(true);
                    await submitOrderFeedback(order.id, feedback.trim());
                    setSavingFeedback(false);
                    toast.success("Feedback enviado com sucesso!");
                  }}
                >
                  {savingFeedback ? "Salvando..." : "Enviar feedback"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-600"
      >
        <MessageCircle className="h-5 w-5" />
        Falar com a Paty
      </a>
    </div>
  );
}
