import type { Product } from "@/lib/types";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getAvailableDates() {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

function formatDateForDisplay(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const stockAvailable = product.stock;
  const orderAvailable = product.orderBalance ?? 0;
  const canAdd = stockAvailable > 0;
  const canOrder = orderAvailable > 0;
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [orderAddedMessage, setOrderAddedMessage] = useState<string>("");
  const badges = [product.partner ? "Parceiro" : null, product.promotion ? "Promoção" : null].filter(Boolean) as string[];

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-warm">
      {badges.length > 0 && (
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          {product.partner && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-card">
              Parceiro
            </span>
          )}
          {product.promotion && (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 shadow-card">
              Promoção
            </span>
          )}
        </div>
      )}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {stockAvailable > 0 ? (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-warm">
            {stockAvailable} est.
          </span>
        ) : orderAvailable > 0 ? (
          <span className="absolute right-3 top-3 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            Encomenda: {orderAvailable}
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-full bg-foreground/85 px-3 py-1 text-xs font-semibold text-background backdrop-blur">
            Esgotado
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
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <span className="text-2xl font-bold text-primary">{brl(product.price)}</span>
          {product.partner && (
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Produto parceiro
            </span>
          )}
          <div className="flex gap-2">
            <Button
              disabled={!canAdd}
              onClick={() => {
                addToCart(product);
                toast.success(`${product.name} adicionado ao carrinho`);
              }}
              variant="outline"
              className="flex-1 rounded-full"
            >
              <ShoppingCart className="mr-1 h-4 w-4" />
              {canAdd ? "Adicionar" : "Sem estoque"}
            </Button>
            <Button
              disabled={!canOrder}
              onClick={() => setShowOrderDialog(true)}
              className="flex-1 rounded-full"
            >
              <Package className="mr-1 h-4 w-4" />
              {canOrder ? "Encomendar" : "Indisponível"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encomendar {product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-date">Quando deseja receber?</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger id="delivery-date" className="rounded-xl">
                  <SelectValue placeholder="Selecione uma data" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableDates().map((date) => (
                    <SelectItem key={date} value={date}>
                      {formatDateForDisplay(date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOrderDialog(false)}
              className="rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!selectedDate) {
                  toast.error("Selecione uma data de entrega");
                  return;
                }
                addToCart(product, 1, selectedDate, "order");
                setOrderAddedMessage(`Encomenda agendada para ${formatDateForDisplay(selectedDate)} e adicionada ao carrinho.`);
                toast.success(`${product.name} encomendado para ${formatDateForDisplay(selectedDate)}`);
                setShowOrderDialog(false);
                setSelectedDate("");
              }}
              className="rounded-full"
            >
              Confirmar encomenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {orderAddedMessage && (
        <div className="border-t border-border/60 bg-green-50 px-5 py-3 text-sm text-green-900">
          {orderAddedMessage}
        </div>
      )}
    </article>
  );
}
