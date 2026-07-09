import type { Product } from "@/lib/types";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const out = product.stock <= 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-warm">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {out ? (
          <span className="absolute right-3 top-3 rounded-full bg-foreground/85 px-3 py-1 text-xs font-semibold text-background backdrop-blur">
            Esgotado
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-warm">
            {product.stock} un.
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="text-2xl font-bold text-primary">{brl(product.price)}</span>
          <Button
            disabled={out}
            onClick={() => {
              addToCart(product);
              toast.success(`${product.name} adicionado ao carrinho`);
            }}
            className="rounded-full"
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            {out ? "Esgotado" : "Adicionar"}
          </Button>
        </div>
      </div>
    </article>
  );
}
