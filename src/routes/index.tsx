import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Heart, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";

function HomeMedia({ videoUrl, fallbackImage, imageUrl }: { videoUrl?: string; fallbackImage: string; imageUrl?: string }) {
  const trimmed = videoUrl?.trim();
  const imageSource = imageUrl?.trim() || fallbackImage;
  if (!trimmed) {
    return <img src={imageSource} alt="Salgados artesanais" className="relative w-full rounded-[2rem] object-cover shadow-glow" />;
  }

  try {
    const parsed = new URL(trimmed);
    const isYouTube = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(parsed.hostname);
    if (isYouTube) {
      const videoId = parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).pop() ?? "";
      const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed;
      return (
        <iframe
          src={embedUrl}
          title="Vídeo da Paty"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="relative aspect-[16/10] w-full rounded-[2rem] border-0 object-cover shadow-glow"
        />
      );
    }

    if (/\.(mp4|webm|ogg)(\?.*)?$/.test(parsed.pathname)) {
      return (
        <video controls autoPlay loop muted playsInline className="relative aspect-[16/10] w-full rounded-[2rem] object-cover shadow-glow">
          <source src={trimmed} />
        </video>
      );
    }
  } catch {
    // falls back to the image below
  }

  return <img src={imageSource} alt="Salgados artesanais" className="relative w-full rounded-[2rem] object-cover shadow-glow" />;
}

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { products, homeVideoUrl, homeImageUrl } = useStore();
  const highlights = products
    .filter((p) => !p.partner)
    .filter((p) => p.price > 0)
    .slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/40 px-4 py-1.5 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Feito com carinho todos os dias
            </span>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] md:text-6xl">
              Sabor caseiro,{" "}
              <span className="text-gradient-warm">crocância perfeita</span>.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Salgados artesanais preparados com ingredientes selecionados e muito amor.
              Encomende agora e receba fresquinho.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full shadow-warm">
                <Link to="/produtos">
                  Ver cardápio <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/missao">Nossa missão</Link>
              </Button>
            </div>
          </div>
          <div className="relative animate-in fade-in zoom-in-95 duration-700">
            <div className="absolute -inset-4 rounded-[2rem] gradient-warm opacity-20 blur-2xl" />
            <HomeMedia videoUrl={homeVideoUrl} imageUrl={homeImageUrl} fallbackImage="https://i.ibb.co/wNXzSCMs/P-o-da-paty.png" />
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Mais pedidos</h2>
            <p className="text-muted-foreground">Os queridinhos da galera</p>
          </div>
          <Link
            to="/produtos"
            className="hidden text-sm font-medium text-primary hover:underline sm:block"
          >
            Ver todos →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Heart, title: "Feito à mão", text: "Cada salgado é preparado com carinho." },
            { icon: Sparkles, title: "Ingredientes frescos", text: "Selecionamos o melhor para você." },
            { icon: Clock, title: "Encomenda rápida", text: "Peça e retire quentinho." },
          ].map((p) => (
            <div
              key={p.title}
              className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm">
                <p.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
