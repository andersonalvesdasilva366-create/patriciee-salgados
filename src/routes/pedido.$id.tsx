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
    if (!order) return;

    const deadline = new Date(new Date(order.createdAt).getTime() + 45 * 60 * 1000);
    const updateCountdown = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) {
        setCountdownLabel("expirado");
        setQrExpired(true);
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdownLabel(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
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
    const timer = window.setInterval(() => {
      void syncOrder();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
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
  const pixKey = "112879119-60";
  const pixPayload = `PIX:${pixKey}|pedido:${order.id}|valor:${order.total.toFixed(2)}`;
  const whatsappUrl = `https://wa.me/5541997474516?text=${encodeURIComponent(`Olá! Gostaria de tirar uma dúvida sobre o pedido ${order.id.slice(0, 8).toUpperCase()} 😊`)}`;
  const adminWhatsappUrl = `https://wa.me/5541997474516?text=${encodeURIComponent(`Olá, Anderson! Vim pelo site e gostaria de falar sobre meu pedido ${order.id.slice(0, 8).toUpperCase()} ou tirar mais informações sobre os salgados da Paty.`)}`;
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
      await navigator.clipboard.writeText(pixKey);
      setCopiedPixKey(true);
      toast.success("Chave Pix copiada!");
      window.setTimeout(() => setCopiedPixKey(false), 2000);
    } catch {
      toast.error("Não foi possível copiar a chave Pix");
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
        <p className="mt-4 text-xs text-muted-foreground">
          Pedido #{order.id.slice(0, 8).toUpperCase()} · {formatDateTime(order.createdAt)}
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Pagamento por Pix</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use a chave abaixo ou escaneie o QR Code com o app do seu banco. O código fica válido por 45 minutos.</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-sm font-medium ${qrExpired ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
            {qrExpired ? "QR expirado" : `Válido por ${countdownLabel}`}
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
              <p className="mt-3 text-center text-sm text-muted-foreground">Abra o app do seu banco e escolha a opção Pix por QR Code para ler este código.</p>
              <p className="mt-2 text-sm font-medium">Valor: {brl(order.total)}</p>
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chave Pix</p>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-background p-3 font-mono text-sm">
                  <span className="break-all">{pixKey}</span>
                  <Button type="button" size="icon" variant="ghost" className="shrink-0 rounded-full" onClick={copyPixKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">O QR Code é gerado para esse pedido e fica disponível durante 45 minutos para facilitar o pagamento.</p>
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
