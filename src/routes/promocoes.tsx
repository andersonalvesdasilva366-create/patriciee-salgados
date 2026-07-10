import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/promocoes")({
  head: () => ({ meta: [{ title: "Promoções — Salgados da Paty" }] }),
  component: PromocoesPage,
});

function PromocoesPage() {
  const { products } = useStore();
  const promoProducts = products.filter((p) => p.promotion);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Promoções</h1>
        <p className="mt-2 text-muted-foreground">Ofertas especiais e produtos em destaque</p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card p-10 text-center shadow-warm">
        <div className="absolute -inset-10 gradient-warm opacity-10 blur-3xl" />
        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-warm text-primary-foreground shadow-warm">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold">
            Produtos em destaque para você! 🎉
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Marque os produtos que quiser destacar aqui na aba de promoções.
          </p>
        </div>
      </div>

      {promoProducts.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhum produto marcado para promoções ainda.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {promoProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
