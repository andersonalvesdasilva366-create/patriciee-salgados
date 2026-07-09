import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/promocoes")({
  head: () => ({ meta: [{ title: "Promoções — Salgados da Paty" }] }),
  component: PromocoesPage,
});

function PromocoesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Promoções</h1>
        <p className="mt-2 text-muted-foreground">Ofertas especiais e combos imperdíveis</p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card p-10 text-center shadow-warm">
        <div className="absolute -inset-10 gradient-warm opacity-10 blur-3xl" />
        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-warm text-primary-foreground shadow-warm">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold">
            Em breve teremos promoções incríveis para você! 🎉
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Estamos preparando ofertas especiais, combos e cupons de desconto.
            Fique de olho por aqui!
          </p>
        </div>
      </div>

      {/* Placeholder para banners futuros */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-3xl border-2 border-dashed border-border/70 bg-secondary/40"
          />
        ))}
      </div>
    </div>
  );
}
