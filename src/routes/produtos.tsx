import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Cardápio — Salgados da Paty" },
      { name: "description", content: "Confira nosso cardápio completo de salgados artesanais." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { products } = useStore();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc">("default");

  const filtered = useMemo(() => {
    const matches = products.filter((p) => !p.partner).filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.description.toLowerCase().includes(q.toLowerCase()),
    );

    if (sort === "price-asc") {
      return [...matches].sort((a, b) => a.price - b.price);
    }
    if (sort === "price-desc") {
      return [...matches].sort((a, b) => b.price - a.price);
    }
    return matches;
  }, [products, q, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold md:text-5xl">Nosso cardápio</h1>
          <p className="mt-1 text-muted-foreground">Escolha seus favoritos e faça sua encomenda.</p>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar salgado..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-full pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(value) => setSort(value as "default" | "price-asc" | "price-desc")}>
            <SelectTrigger className="w-full rounded-full sm:w-[200px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrão</SelectItem>
              <SelectItem value="price-asc">Menor preço</SelectItem>
              <SelectItem value="price-desc">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhum salgado encontrado.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
