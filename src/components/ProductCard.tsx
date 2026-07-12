import type { Product } from "@/lib/types";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Package, MessageCircleMore, PlayCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
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
  const { addToCart, feedbacks, submitProductFeedback } = useStore();
  const stockAvailable = product.stock;
  const orderAvailable = product.orderBalance ?? 0;
  const canAdd = stockAvailable > 0;
  const canOrder = orderAvailable > 0;
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [orderAddedMessage, setOrderAddedMessage] = useState<string>("");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dialogVideoRef = useRef<HTMLVideoElement | null>(null);
  const badges = [product.partner ? "Parceiro" : null, product.promotion ? "Promoção" : null, product.featured ? "Destaque" : null, product.offerLabel ? product.offerLabel : null].filter(Boolean) as string[];
  const approvedFeedback = feedbacks.filter((item) => item.approved && !item.isBot && item.productId === product.id);
  const detailMediaUrl = (product.mediaUrl ?? "").trim() || product.imageUrl;
  const shouldRenderVideo = product.mediaType === "video" && !!detailMediaUrl;

  useEffect(() => {
    if (!showDetailsDialog) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      if (dialogVideoRef.current) {
        dialogVideoRef.current.pause();
        dialogVideoRef.current.currentTime = 0;
      }
      return;
    }

    if (dialogVideoRef.current && shouldRenderVideo) {
      dialogVideoRef.current.currentTime = 0;
      void dialogVideoRef.current.play().catch(() => undefined);
    }
  }, [showDetailsDialog, shouldRenderVideo]);

  const handleFeedbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackComment.trim()) {
      toast.error("Informe nome e comentário");
      return;
    }
    await submitProductFeedback(product.id, feedbackName, feedbackComment);
    setFeedbackName("");
    setFeedbackComment("");
    toast.success("Comentário enviado para análise do admin.");
  };

  const handleMediaPlay = () => {
    if (videoRef.current && shouldRenderVideo) {
      void videoRef.current.play().catch(() => undefined);
    }
  };

  const handleMediaPause = () => {
    if (videoRef.current && shouldRenderVideo) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setShowDetailsDialog(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowDetailsDialog(true);
          }
        }}
        className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-warm"
      >
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
        <div
          className="relative aspect-[4/3] overflow-hidden bg-muted"
          onMouseEnter={shouldRenderVideo ? handleMediaPlay : undefined}
          onMouseLeave={shouldRenderVideo ? handleMediaPause : undefined}
        >
          {shouldRenderVideo ? (
            <video
              ref={videoRef}
              src={detailMediaUrl}
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <img
              src={detailMediaUrl}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {shouldRenderVideo && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white/90">
              <PlayCircle className="h-10 w-10" />
            </span>
          )}
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
            {product.highlightDescription && (
              <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                <p className="font-semibold">{product.offerLabel || "Destaque"}</p>
                <p className="mt-1">{product.highlightDescription}</p>
              </div>
            )}
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
                onClick={(event) => {
                  event.stopPropagation();
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
                onClick={(event) => {
                  event.stopPropagation();
                  setShowOrderDialog(true);
                }}
                className="flex-1 rounded-full"
              >
                <Package className="mr-1 h-4 w-4" />
                {canOrder ? "Encomendar" : "Indisponível"}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                setShowDetailsDialog(true);
              }}
              className="rounded-full"
            >
              Ver detalhes
            </Button>
          </div>
        </div>
      </article>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
              {shouldRenderVideo ? (
                <video
                  ref={dialogVideoRef}
                  src={detailMediaUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src={detailMediaUrl} alt={product.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm leading-6 text-muted-foreground">{product.description}</p>
              {product.highlightDescription && (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                  <p className="font-semibold">{product.offerLabel || "Destaque"}</p>
                  <p className="mt-1">{product.highlightDescription}</p>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl font-bold text-primary">{brl(product.price)}</span>
                <span className="text-sm text-muted-foreground">{stockAvailable > 0 ? `${stockAvailable} disponíveis` : orderAvailable > 0 ? `${orderAvailable} para encomenda` : "Esgotado"}</span>
              </div>
            </div>
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
                onClick={() => {
                  setShowOrderDialog(true);
                }}
                className="flex-1 rounded-full"
              >
                <Package className="mr-1 h-4 w-4" />
                {canOrder ? "Encomendar" : "Indisponível"}
              </Button>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageCircleMore className="h-4 w-4 text-primary" /> Comentários
              </div>
              {approvedFeedback.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {approvedFeedback.map((comment) => (
                    <div key={comment.id} className="rounded-2xl border border-border/60 bg-background/70 p-2.5 text-sm">
                      <p className="font-medium">{comment.name}</p>
                      <p className="mt-1 text-muted-foreground">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Ainda não há comentários aprovados para este produto.</p>
              )}
              <form onSubmit={handleFeedbackSubmit} className="mt-4 space-y-2">
                <div className="space-y-2">
                  <Label htmlFor={`feedback-name-${product.id}`}>Seu nome</Label>
                  <Input id={`feedback-name-${product.id}`} value={feedbackName} onChange={(e) => setFeedbackName(e.target.value)} placeholder="Digite seu nome" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`feedback-comment-${product.id}`}>Seu comentário</Label>
                  <Textarea id={`feedback-comment-${product.id}`} value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="Compartilhe sua experiência" className="rounded-xl" />
                </div>
                <Button type="submit" className="w-full rounded-full">Enviar comentário</Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
