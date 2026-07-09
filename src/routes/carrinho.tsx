import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho — Salgados da Paty" }] }),
  component: CartPage,
});

function CartPage() {
  const { cart, cartTotal, setQuantity, removeFromCart, products } = useStore();

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-secondary">
          <ShoppingBag className="h-9 w-9 text-primary" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">
          Que tal escolher alguns salgados deliciosos?
        </p>
        <Button asChild size="lg" className="mt-6 rounded-full">
          <Link to="/produtos">Ver cardápio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl font-bold">Seu carrinho</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-4">
          {cart.map((item) => {
            const prod = products.find((p) => p.id === item.productId);
            const max = item.kind === "order" ? (prod?.orderBalance ?? item.quantity) : (prod?.stock ?? item.quantity);
            return (
              <li
                key={item.productId}
                className="flex gap-4 rounded-3xl border border-border/60 bg-card p-4 shadow-card"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{brl(item.price)} un.</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full border border-border">
                      <button
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        disabled={item.quantity >= max}
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-semibold text-primary">
                      {brl(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-3xl border border-border/60 bg-card p-6 shadow-card lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-bold">Resumo</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd>{brl(cartTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-lg font-bold">
              <dt>Total</dt>
              <dd className="text-primary">{brl(cartTotal)}</dd>
            </div>
          </dl>
          <Button asChild size="lg" className="mt-6 w-full rounded-full shadow-warm">
            <Link to="/checkout">Finalizar pedido</Link>
          </Button>
          <Link
            to="/produtos"
            className="mt-3 block text-center text-sm text-muted-foreground hover:text-primary"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
