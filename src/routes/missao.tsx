import { createFileRoute } from "@tanstack/react-router";
import { Heart, Sparkles, Users, Utensils } from "lucide-react";

export const Route = createFileRoute("/missao")({
  head: () => ({
    meta: [
      { title: "Nossa Missão — Salgados da Paty" },
      { name: "description", content: "Nossa missão é levar alegria em forma de salgados feitos com carinho." },
    ],
  }),
  component: MissaoPage,
});

function MissaoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <span className="inline-flex animate-in fade-in slide-in-from-bottom-4 items-center gap-2 rounded-full bg-accent/40 px-4 py-1.5 text-xs font-semibold text-accent-foreground duration-700">
          <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> Nossa história
        </span>
        <h1 className="mt-4 animate-in fade-in slide-in-from-bottom-6 font-display text-5xl font-extrabold duration-700 md:text-6xl">
          Nossa Missão <span className="text-gradient-warm">❤️</span>
        </h1>
      </div>

      <div className="mx-auto mt-12 max-w-2xl space-y-6 text-lg leading-relaxed text-foreground/85">
        {[
          "Na Salgados da Paty acreditamos que cada salgado pode levar alegria para o dia de alguém.",
          "Nosso compromisso é preparar tudo com carinho, ingredientes de qualidade e muito amor.",
          "Mais do que vender salgados, queremos proporcionar momentos especiais, seja no café da manhã, na pausa do trabalho ou em uma confraternização.",
          "Obrigado por fazer parte dessa história.",
          "Seu pedido é preparado com dedicação do começo ao fim.",
        ].map((line, i) => (
          <p
            key={i}
            className="animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${i * 150 + 200}ms`, animationDuration: "700ms", animationFillMode: "both" }}
          >
            {line}
          </p>
        ))}
        <p
          className="animate-in fade-in slide-in-from-bottom-4 text-center font-display text-2xl font-bold text-gradient-warm"
          style={{ animationDelay: "1000ms", animationDuration: "700ms", animationFillMode: "both" }}
        >
          ❤️ Salgados da Paty
        </p>
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          { icon: Utensils, title: "Feito à mão", text: "Preparado diariamente com receitas de família." },
          { icon: Sparkles, title: "Qualidade", text: "Ingredientes selecionados a cada encomenda." },
          { icon: Users, title: "Com carinho", text: "Cada pedido é único e recebe atenção especial." },
        ].map((p, i) => (
          <div
            key={p.title}
            className="animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-border/60 bg-card p-6 text-center shadow-card"
            style={{ animationDelay: `${i * 120 + 1100}ms`, animationDuration: "700ms", animationFillMode: "both" }}
          >
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm">
              <p.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
