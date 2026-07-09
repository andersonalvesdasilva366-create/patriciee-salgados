import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { brl, formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { Check, Clock, Package, Send, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const { orders, submitOrderFeedback } = useStore();
  const order = orders.find((o) => o.id === id);
  const [feedback, setFeedback] = useState(order?.feedback ?? "");
  const [savingFeedback, setSavingFeedback] = useState(false);

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

      {/* Timeline */}
      <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <h2 className="font-display text-xl font-bold">Andamento</h2>
        <ol className="mt-6 space-y-4">
          {STEPS.map((step, idx) => {
            const done = idx <= currentIndex;
            const active = idx === currentIndex;
            return (
              <li key={step.key} className="flex items-center gap-4">
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

      {/* Details */}
      <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <h2 className="font-display text-xl font-bold">Detalhes</h2>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Cliente</dt><dd className="font-medium">{order.customerName}</dd></div>
          <div><dt className="text-muted-foreground">Whatsapp</dt><dd className="font-medium">{order.whatsapp}</dd></div>
          {order.notes && (
            <div className="sm:col-span-2">
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

        {order.status === "enviado" && (
          <div className="mt-6 rounded-3xl border border-border/60 bg-muted/5 p-5">
            <h2 className="font-display text-xl font-bold">Deixe seu feedback</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Conte como foi a entrega do seu pedido. Isso ajuda a Paty a melhorar sempre.
            </p>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Escreva seu feedback aqui..."
              className="mt-4 min-h-[120px] rounded-3xl"
            />
            <Button
              className="mt-4 rounded-full"
              disabled={savingFeedback}
              onClick={async () => {
                setSavingFeedback(true);
                await submitOrderFeedback(order.id, feedback.trim());
                setSavingFeedback(false);
              }}
            >
              {savingFeedback ? "Salvando..." : order.feedback ? "Atualizar feedback" : "Enviar feedback"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
