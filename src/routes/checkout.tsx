import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { z } from "zod";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Finalizar pedido — Salgados da Paty" }] }),
  component: CheckoutPage,
});

const schema = z.object({
  customerName: z.string().trim().min(2, "Informe seu nome").max(100),
  whatsapp: z.string().trim().min(8, "Informe um Whatsapp válido").max(20),
  notes: z.string().max(500).optional().default(""),
});

function CheckoutPage() {
  const { cart, cartTotal, createOrder } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ customerName: "", whatsapp: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Seu carrinho está vazio</h1>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/produtos">Ver cardápio</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const order = await createOrder(parsed.data);
    if (order) {
      navigate({ to: "/pedido/$id", params: { id: order.id } });
    } else {
      toast.error("Erro ao criar pedido");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl font-bold">Finalizar pedido</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-3xl border border-border/60 bg-card p-6 shadow-card"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cliente</Label>
            <Input
              id="name"
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Seu nome completo"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whats">Whatsapp</Label>
            <Input
              id="whats"
              required
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="(00) 00000-0000"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Alguma observação sobre o pedido?"
              rows={4}
              className="rounded-xl"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full rounded-full shadow-warm"
          >
            Confirmar pedido
          </Button>
        </form>

        <aside className="h-fit rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-bold">Resumo</h2>
          <ul className="mt-4 divide-y divide-border">
            {cart.map((i) => (
              <li key={i.productId} className="flex justify-between py-2 text-sm">
                <span className="truncate pr-2">
                  {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
                </span>
                <span className="shrink-0 font-medium">{brl(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{brl(cartTotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
