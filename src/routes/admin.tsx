import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { brl, formatDateTime } from "@/lib/format";
import type { ExpenseEntry, Order, OrderStatus, Product, RevenueEntry } from "@/lib/types";
import { ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert, CircleDollarSign, Edit, LogOut, MessageSquareText, Package2, Plus, Receipt, Sparkles, Trash2, TrendingUp, WalletCards, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Salgados da Paty" }] }),
  component: AdminPage,
});

const STATUS_LABEL: Record<OrderStatus, string> = {
  recebido: "Pedido Recebido",
  encomendado: "Encomendado",
  agendado: "Agendado",
  enviado: "Enviado",
};

const STATUS_VARIANT: Record<OrderStatus, string> = {
  recebido: "bg-accent/60 text-accent-foreground",
  encomendado: "bg-primary/15 text-primary",
  agendado: "bg-blue-500/15 text-blue-700",
  enviado: "bg-success/20 text-success",
};

function AdminPage() {
  const { loginAdmin, logoutAdmin } = useStore();
  const [pwd, setPwd] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/me", { method: "GET" });
        if (active) setIsAuthenticated(response.ok);
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setCheckingAuth(false);
      }
    };

    void checkSession();
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await loginAdmin(pwd);
    setIsAuthenticated(ok);
    if (!ok) toast.error("Senha incorreta");
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  if (checkingAuth) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-warm text-center">
          <p className="text-sm text-muted-foreground">Validando acesso ao painel…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-warm">
          <h1 className="font-display text-2xl font-bold">Área Administrativa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre para gerenciar produtos, pedidos e finanças.</p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha</Label>
              <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="rounded-xl" placeholder="Digite a senha" />
            </div>
            <Button type="submit" className="w-full rounded-full">Entrar</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Gerencie produtos, pedidos, comentários e finanças.</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="rounded-full">
          <TabsTrigger value="orders" className="rounded-full">Pedidos</TabsTrigger>
          <TabsTrigger value="products" className="rounded-full">Produtos</TabsTrigger>
          <TabsTrigger value="home" className="rounded-full">Home</TabsTrigger>
          <TabsTrigger value="feedbacks" className="rounded-full">Comentários</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-full">Vendas & Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6"><OrdersPanel /></TabsContent>
        <TabsContent value="products" className="mt-6"><ProductsPanel /></TabsContent>
        <TabsContent value="home" className="mt-6"><HomeSettingsPanel /></TabsContent>
        <TabsContent value="feedbacks" className="mt-6"><FeedbacksPanel /></TabsContent>
        <TabsContent value="finance" className="mt-6"><FinancePanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function OrdersPanel() {
  const { orders } = useStore();
  const [filter, setFilter] = useState<"all" | "pendentes" | "concluidos" | "enviados">("all");

  const filtered = orders.filter((o) => {
    if (filter === "pendentes") return o.status === "recebido" || o.status === "encomendado";
    if (filter === "concluidos") return o.status === "agendado" || o.status === "enviado";
    if (filter === "enviados") return o.status === "enviado";
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "pendentes", "concluidos", "enviados"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground shadow-card" : "bg-secondary text-foreground/70 hover:bg-secondary/70"}`}>
            {f === "all" ? "Todos" : f === "pendentes" ? "Pendentes" : f === "concluidos" ? "Concluídos" : "Enviados"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum pedido nesta categoria.</p>
      ) : (
        <ul className="space-y-3">{filtered.map((order) => <OrderRow key={order.id} order={order} />)}</ul>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const { updateOrderStatus } = useStore();
  const [scheduled, setScheduled] = useState(order.scheduledAt ?? "");
  const [adminMessage, setAdminMessage] = useState(order.adminMessage ?? "");

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{order.customerName}</span>
            <Badge className={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{order.whatsapp} · {formatDateTime(order.createdAt)} · #{order.orderCode}</p>
        </div>
        <span className="text-lg font-bold text-primary">{brl(order.total)}</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {order.items.map((i) => (
          <li key={i.productId} className="rounded-full bg-secondary px-2.5 py-1">{i.name} × {i.quantity}</li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-2 rounded-lg bg-muted/60 p-2 text-sm">
          <span className="font-medium">Obs:</span> {order.notes}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <Label className="text-xs">Status</Label>
          <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v as OrderStatus, v === "agendado" ? scheduled || undefined : undefined, adminMessage.trim() || undefined)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {order.status === "agendado" && (
          <div>
            <Label className="text-xs">Agendado para</Label>
            <Input type="datetime-local" value={scheduled ? scheduled.slice(0, 16) : ""} onChange={(e) => { const iso = e.target.value ? new Date(e.target.value).toISOString() : ""; setScheduled(iso); updateOrderStatus(order.id, "agendado", iso || undefined, adminMessage.trim() || undefined); }} className="rounded-xl" />
          </div>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Mensagem destacada para o cliente</Label>
          <Textarea value={adminMessage} onChange={(e) => { setAdminMessage(e.target.value); updateOrderStatus(order.id, order.status, order.scheduledAt, e.target.value.trim() || undefined); }} className="min-h-[90px] rounded-xl" placeholder="Ex.: Seu pedido está pronto, retirar com Anderson às 19h." />
        </div>
        {order.feedback && (
          <div className="rounded-2xl bg-secondary/50 p-3 text-sm text-foreground">
            <p className="font-medium">Feedback do cliente:</p>
            <p className="whitespace-pre-line">{order.feedback}</p>
          </div>
        )}
      </div>
    </li>
  );
}

function ProductsPanel() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [stockToAdd, setStockToAdd] = useState(0);
  const [orderToAdd, setOrderToAdd] = useState(0);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const handleAdjustSubmit = async () => {
    if (!adjustProduct) return;
    const patch: Partial<Product> = {};
    if (stockToAdd !== 0) patch.stock = Math.max(0, adjustProduct.stock + stockToAdd);
    if (orderToAdd !== 0) patch.orderBalance = Math.max(0, (adjustProduct.orderBalance ?? 0) + orderToAdd);

    if (!patch.stock && !patch.orderBalance) {
      toast.error("Informe pelo menos um valor para ajustar");
      return;
    }

    try {
      await updateProduct(adjustProduct.id, patch);
      toast.success("Estoque atualizado");
      setAdjustOpen(false);
      setAdjustProduct(null);
      setStockToAdd(0);
      setOrderToAdd(0);
    } catch {
      toast.error("Erro ao ajustar estoque");
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full" onClick={() => setEditing(null)}>
              <Plus className="mr-1 h-4 w-4" /> Novo produto
            </Button>
          </DialogTrigger>
          <ProductDialog product={editing} onSubmit={async (data) => { try { if (editing) { await updateProduct(editing.id, data); toast.success("Produto atualizado"); } else { await addProduct(data); toast.success("Produto adicionado"); } setOpen(false); setEditing(null); } catch { toast.error("Erro ao salvar produto"); } }} />
        </Dialog>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum produto cadastrado.</p>
      ) : (
        <>
          <ul className="grid gap-3">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3 shadow-card">
                <img src={p.imageUrl} alt={p.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{p.name}</p>
                    {p.featured && <Badge className="bg-amber-500/15 text-amber-700">Destaque</Badge>}
                    {p.offerLabel && <Badge variant="secondary">{p.offerLabel}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{brl(p.price)} · estoque: {p.stock} · encomenda: {p.orderBalance ?? 0}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="rounded-full" onClick={() => { setAdjustProduct(p); setAdjustOpen(true); }}><Plus className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="rounded-full" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={async () => { if (confirm(`Excluir "${p.name}"?`)) { try { await deleteProduct(p.id); toast.success("Produto excluído"); } catch { toast.error("Erro ao excluir produto"); } } }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>

          <Dialog open={adjustOpen} onOpenChange={(v) => { setAdjustOpen(v); if (!v) setAdjustProduct(null); }}>
            <DialogContent className="rounded-3xl">
              <DialogHeader><DialogTitle>Ajustar estoque e encomenda</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Ajuste o estoque ou encomenda para <strong>{adjustProduct?.name}</strong>. Use valores negativos para diminuir.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Estoque (±)</Label>
                    <Input type="number" step="1" value={stockToAdd} onChange={(e) => setStockToAdd(Number(e.target.value))} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Encomenda (±)</Label>
                    <Input type="number" step="1" value={orderToAdd} onChange={(e) => setOrderToAdd(Number(e.target.value))} className="rounded-xl" />
                  </div>
                </div>
                <DialogFooter>
                  <Button className="rounded-full" onClick={handleAdjustSubmit}>Salvar ajuste</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function ProductDialog({ product, onSubmit }: { product: Product | null; onSubmit: (data: Omit<Product, "id">) => Promise<void>; }) {
  const [form, setForm] = useState<Omit<Product, "id">>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    imageUrl: product?.imageUrl ?? "",
    price: product?.price ?? 0,
    stock: product?.stock ?? 0,
    orderBalance: product?.orderBalance ?? 0,
    partner: product?.partner ?? false,
    partnerUrl: product?.partnerUrl ?? "",
    promotion: product?.promotion ?? false,
    offerLabel: product?.offerLabel ?? "",
    highlightDescription: product?.highlightDescription ?? "",
    featured: product?.featured ?? false,
    mediaUrl: product?.mediaUrl ?? "",
    mediaType: product?.mediaType ?? "image",
  });
  const previewUrl = (form.mediaUrl?.trim() || form.imageUrl?.trim() || "").trim();
  const previewLabel = form.mediaType === "video" ? "Pré-visualização do vídeo" : "Pré-visualização da imagem";

  useEffect(() => {
    setForm({
      name: product?.name ?? "",
      description: product?.description ?? "",
      imageUrl: product?.imageUrl ?? "",
      price: product?.price ?? 0,
      stock: product?.stock ?? 0,
      orderBalance: product?.orderBalance ?? 0,
      partner: product?.partner ?? false,
      partnerUrl: product?.partnerUrl ?? "",
      promotion: product?.promotion ?? false,
      offerLabel: product?.offerLabel ?? "",
      highlightDescription: product?.highlightDescription ?? "",
      featured: product?.featured ?? false,
      mediaUrl: product?.mediaUrl ?? "",
      mediaType: product?.mediaType ?? "image",
    });
  }, [product]);

  return (
    <DialogContent className="rounded-3xl">
      <DialogHeader><DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
      <form onSubmit={async (e) => { e.preventDefault(); if (!form.name.trim() || !form.imageUrl.trim()) { toast.error("Preencha nome e imagem"); return; } await onSubmit({ ...form, name: form.name.trim(), description: form.description.trim(), imageUrl: form.imageUrl.trim(), price: Number(form.price) || 0, stock: Math.max(0, Math.floor(Number(form.stock) || 0)), orderBalance: Math.max(0, Math.floor(Number(form.orderBalance) || 0)), offerLabel: form.offerLabel?.trim() ?? "", highlightDescription: form.highlightDescription?.trim() ?? "", featured: Boolean(form.featured), mediaUrl: form.mediaUrl?.trim() ?? "", mediaType: (form.mediaType === "video" ? "video" : "image") as "image" | "video", }); }} className="space-y-4">
        <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" /></div>
        <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" /></div>
        <div className="space-y-2"><Label>URL da imagem</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="rounded-xl" placeholder="https://..." /></div>
        <div className="space-y-2"><Label>URL da mídia do produto</Label><Input value={form.mediaUrl ?? ""} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} className="rounded-xl" placeholder="https://.../video.mp4 ou imagem.jpg" /></div>
        <div className="space-y-2"><Label>Tipo da mídia</Label><Select value={form.mediaType ?? "image"} onValueChange={(value) => setForm({ ...form, mediaType: value as "image" | "video" })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="image">Imagem</SelectItem><SelectItem value="video">Vídeo</SelectItem></SelectContent></Select></div>
        <div className="rounded-2xl border border-border/60 bg-secondary/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Label>{previewLabel}</Label>
            <Badge variant="secondary">{form.mediaType === "video" ? "Vídeo" : "Imagem"}</Badge>
          </div>
          {previewUrl ? (
            form.mediaType === "video" ? (
              <video src={previewUrl} controls muted autoPlay loop playsInline className="h-40 w-full rounded-xl object-cover bg-muted" />
            ) : (
              <img src={previewUrl} alt="Preview do produto" className="h-40 w-full rounded-xl object-cover bg-muted" />
            )
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Cole uma URL para visualizar a mídia aqui.
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="rounded-xl" /></div>
          <div className="space-y-2"><Label>Saldo de estoque</Label><Input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="rounded-xl" /></div>
        </div>
        <div className="space-y-2"><Label>Saldo de encomenda</Label><Input type="number" min="0" step="1" value={form.orderBalance ?? 0} onChange={(e) => setForm({ ...form, orderBalance: Number(e.target.value) })} className="rounded-xl" /></div>
        <div className="space-y-2"><Label>Oferta / Destaque</Label><Input value={form.offerLabel ?? ""} onChange={(e) => setForm({ ...form, offerLabel: e.target.value })} className="rounded-xl" placeholder="Ex.: Oferta do dia" /></div>
        <div className="space-y-2"><Label>Site do parceiro</Label><Input value={form.partnerUrl ?? ""} onChange={(e) => setForm({ ...form, partnerUrl: e.target.value })} className="rounded-xl" placeholder="https://exemplo.com" /><p className="text-xs text-muted-foreground">Se preenchido, um botão de acesso aparece na página de parceiros.</p></div>
        <div className="space-y-2"><Label>Descrição destacada</Label><Textarea value={form.highlightDescription ?? ""} onChange={(e) => setForm({ ...form, highlightDescription: e.target.value })} className="rounded-xl" placeholder="Texto que aparecerá destacado no produto" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/50 p-4"><Switch checked={form.promotion} onCheckedChange={(checked) => setForm({ ...form, promotion: checked })} /><div><p className="text-sm font-semibold">Exibir em Promoções</p><p className="text-xs text-muted-foreground">Mostra este produto na aba de promoções.</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/50 p-4"><Switch checked={form.featured} onCheckedChange={(checked) => setForm({ ...form, featured: checked })} /><div><p className="text-sm font-semibold">Destacar no cardápio</p><p className="text-xs text-muted-foreground">Marca o item com destaque e mensagem especial.</p></div></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/50 p-4"><Switch checked={form.partner} onCheckedChange={(checked) => setForm({ ...form, partner: checked })} /><div><p className="text-sm font-semibold">Produto parceiro</p><p className="text-xs text-muted-foreground">Destaca este item como parceiro.</p></div></div>
        <DialogFooter><Button type="submit" className="rounded-full">Salvar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function HomeSettingsPanel() {
  const { homeVideoUrl, homeImageUrl, setHomeVideoUrl, setHomeImageUrl } = useStore();
  const [videoValue, setVideoValue] = useState(homeVideoUrl);
  const [imageValue, setImageValue] = useState(homeImageUrl);

  useEffect(() => {
    setVideoValue(homeVideoUrl);
  }, [homeVideoUrl]);

  useEffect(() => {
    setImageValue(homeImageUrl);
  }, [homeImageUrl]);

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Conteúdo da home</h2>
          <p className="text-sm text-muted-foreground">Defina um vídeo ou uma imagem para aparecer no destaque principal da página inicial.</p>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        <div className="space-y-2">
          <Label>Link do vídeo</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={videoValue}
              onChange={(e) => setVideoValue(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="rounded-xl"
            />
            <Button className="rounded-full" onClick={() => { setHomeVideoUrl(videoValue); toast.success("Link do vídeo salvo"); }}>
              Salvar vídeo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Aceita YouTube, MP4 ou WebM.</p>
        </div>

        <div className="space-y-2">
          <Label>URL da imagem da home</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={imageValue}
              onChange={(e) => setImageValue(e.target.value)}
              placeholder="https://.../imagem.jpg"
              className="rounded-xl"
            />
            <Button variant="outline" className="rounded-full" onClick={() => { setHomeImageUrl(imageValue); toast.success("Imagem da home salva"); }}>
              Salvar imagem
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Se houver vídeo, ele terá prioridade. Se não, a imagem será exibida.</p>
        </div>
      </div>
    </div>
  );
}

function FeedbacksPanel() {
  const { feedbacks, approveFeedback } = useStore();
  const pending = feedbacks.filter((item) => !item.approved && !item.isBot);
  const approved = feedbacks.filter((item) => item.approved && !item.isBot);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-primary" /><h2 className="font-semibold">Pendentes para aprovação</h2></div>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum comentário aguardando revisão.</p> : <div className="space-y-3">{pending.map((item) => <div key={item.id} className="rounded-2xl border border-border/60 bg-secondary/40 p-3"> <div className="flex items-center justify-between gap-2"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p></div><Badge variant="secondary">Aguardando</Badge></div><p className="mt-2 text-sm text-foreground">{item.comment}</p><div className="mt-3 flex gap-2"><Button size="sm" className="rounded-full" onClick={() => approveFeedback(item.id, true)}><CheckCircle2 className="mr-1 h-4 w-4" />Aprovar</Button><Button size="sm" variant="outline" className="rounded-full" onClick={() => approveFeedback(item.id, false)}><XCircle className="mr-1 h-4 w-4" />Rejeitar</Button></div></div>)}</div>}
      </div>
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-semibold">Comentários aprovados</h2></div>
        {approved.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há comentários públicos.</p> : <div className="space-y-3">{approved.map((item) => <div key={item.id} className="rounded-2xl border border-border/60 bg-secondary/40 p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium">{item.name}</p><Badge variant="secondary">Publicado</Badge></div><p className="mt-2 text-sm">{item.comment}</p></div>)}</div>}
      </div>
    </div>
  );
}

function FinancePanel() {
  const { orders, expenses, revenues, products, salesTarget, setSalesTarget, addExpense, deleteExpense, addRevenue, deleteRevenue } = useStore();
  const [targetInput, setTargetInput] = useState(salesTarget);
  const [averageTicket, setAverageTicket] = useState(60);
  const [historyRange, setHistoryRange] = useState<"all" | "today" | "week" | "month">("month");
  const [historyCategory, setHistoryCategory] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [expenseForm, setExpenseForm] = useState<Omit<ExpenseEntry, "id">>({ description: "", amount: 0, category: "", quantity: 1, status: "pendente", paidAt: new Date().toISOString().slice(0, 10), expectedReturnAt: "", expectedProfit: 0, notes: "" });
  const [revenueForm, setRevenueForm] = useState<Omit<RevenueEntry, "id">>({ description: "", amount: 0, category: "", receivedAt: new Date().toISOString().slice(0, 10), status: "recebida", notes: "" });

  const ordersRevenue = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  const manualRevenue = useMemo(() => revenues.reduce((sum, revenue) => sum + revenue.amount, 0), [revenues]);
  const revenue = ordersRevenue + manualRevenue;
  const soldUnits = useMemo(() => orders.reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0), [orders]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount * (expense.quantity ?? 1), 0), [expenses]);
  const profit = revenue - totalExpenses;

  const salesPeriodSummary = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const parseDate = (value: string) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const sumOrders = (from: Date) => orders.reduce((sum, order) => {
      const createdAt = parseDate(order.createdAt);
      return createdAt && createdAt >= from ? sum + order.total : sum;
    }, 0);

    const sumRevenues = (from: Date) => revenues.reduce((sum, revenue) => {
      const receivedAt = parseDate(revenue.receivedAt);
      return receivedAt && receivedAt >= from ? sum + revenue.amount : sum;
    }, 0);

    const dailyRevenue = sumOrders(startOfToday) + sumRevenues(startOfToday);
    const weeklyRevenue = sumOrders(startOfWeek) + sumRevenues(startOfWeek);
    const monthlyRevenue = sumOrders(startOfMonth) + sumRevenues(startOfMonth);

    const daysInMonth = now.getDate();
    const daysRemaining = Math.max(0, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1);
    const projectedMonthlyRevenue = monthlyRevenue + Math.max(0, (dailyRevenue > 0 ? dailyRevenue : 0) * daysRemaining);

    return {
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      projectedMonthlyRevenue,
      progress: salesTarget > 0 ? Math.min(100, (monthlyRevenue / salesTarget) * 100) : 0,
      remainingToGoal: Math.max(0, salesTarget - monthlyRevenue),
      salesNeeded: averageTicket > 0 ? Math.max(0, Math.ceil(Math.max(0, salesTarget - monthlyRevenue) / averageTicket)) : 0,
      estimatedRevenue: monthlyRevenue + Math.max(0, salesTarget - monthlyRevenue),
      dailyAverage: dailyRevenue > 0 ? dailyRevenue / Math.max(1, daysInMonth) : 0,
      daysRemaining,
    };
  }, [averageTicket, orders, revenues, salesTarget]);

  const progress = salesPeriodSummary.progress;
  const remainingToGoal = salesPeriodSummary.remainingToGoal;
  const salesNeeded = salesPeriodSummary.salesNeeded;
  const estimatedRevenue = salesPeriodSummary.estimatedRevenue;
  const projectedMonthlyRevenue = salesPeriodSummary.projectedMonthlyRevenue;
  const categorySummary = useMemo(() => {
    const map = expenses.reduce<Record<string, number>>((acc, expense) => {
      const category = expense.category?.trim() || "Sem categoria";
      acc[category] = (acc[category] ?? 0) + expense.amount * (expense.quantity ?? 1);
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([category, total]) => ({ category, total }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses.filter((expense) => {
      const paidAt = new Date(expense.paidAt);
      const matchesRange = historyRange === "all" || (historyRange === "today" && paidAt >= startOfToday) || (historyRange === "week" && paidAt >= startOfWeek) || (historyRange === "month" && paidAt >= startOfMonth);
      const matchesCategory = historyCategory === "all" || expense.category?.toLowerCase() === historyCategory.toLowerCase();
      const matchesSearch = historySearch.trim() === "" || [expense.description, expense.category, expense.notes ?? ""].join(" ").toLowerCase().includes(historySearch.toLowerCase());
      return matchesRange && matchesCategory && matchesSearch;
    });
  }, [expenses, historyCategory, historyRange, historySearch]);

  const inventoryRows = useMemo(() => products.map((product) => ({
    ...product,
    status: product.stock <= 0 ? "Esgotado" : product.stock <= 5 ? "Baixo" : "OK",
  })).sort((a, b) => a.stock - b.stock), [products]);

  const attentionAlerts = useMemo(() => {
    const alerts: Array<{ title: string; detail: string; tone: "warning" | "danger" | "success" }> = [];

    if (products.some((product) => product.stock <= 0)) {
      alerts.push({
        title: "Produtos sem estoque",
        detail: `${products.filter((product) => product.stock <= 0).length} item(ns) precisa(m) reposição imediata.`,
        tone: "danger",
      });
    }

    if (expenses.some((expense) => expense.status === "pendente")) {
      alerts.push({
        title: "Gastos pendentes",
        detail: `${expenses.filter((expense) => expense.status === "pendente").length} gasto(s) ainda aguardam confirmação.`,
        tone: "warning",
      });
    }

    if (remainingToGoal > 0) {
      alerts.push({
        title: "Meta ainda não atingida",
        detail: `Faltam ${brl(remainingToGoal)} para a meta mensal.`,
        tone: "warning",
      });
    }

    if (profit < 0) {
      alerts.push({
        title: "Lucro líquido negativo",
        detail: `O resultado atual está em ${brl(profit)}.`,
        tone: "danger",
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        title: "Tudo em ordem",
        detail: "Nenhum alerta crítico foi detectado no momento.",
        tone: "success",
      });
    }

    return alerts;
  }, [expenses, products, profit, remainingToGoal]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const offset = (start.getDay() + 6) % 7;
    const cells = Math.ceil((offset + end.getDate()) / 7) * 7;
    return Array.from({ length: cells }).map((_, index) => {
      const dayOffset = index - offset + 1;
      const date = new Date(year, month, dayOffset);
      const key = date.toISOString().slice(0, 10);
      const events = orders.filter((order) => order.createdAt.slice(0, 10) === key).length + expenses.filter((expense) => expense.paidAt === key).length;
      return { date, isCurrentMonth: date.getMonth() === month, events };
    });
  }, [calendarMonth, expenses, orders]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr]">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleDollarSign className="h-4 w-4 text-primary" />Entradas de caixa</div>
          <p className="mt-2 text-3xl font-bold">{brl(revenue)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Vendas + receitas manuais registradas até hoje.</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Package2 className="h-4 w-4 text-primary" />Unidades vendidas</div>
          <p className="mt-2 text-2xl font-bold">{soldUnits}</p>
          <p className="mt-2 text-sm text-muted-foreground">Quantidade total de itens vendidos.</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Receipt className="h-4 w-4 text-primary" />Saídas</div>
          <p className="mt-2 text-2xl font-bold">{brl(totalExpenses)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Somatório de todos os gastos cadastrados.</p>
        </div>
        <div className={`rounded-3xl border p-5 shadow-card ${profit >= 0 ? "border-emerald-500/20 bg-emerald-500/10" : "border-destructive/20 bg-destructive/10"}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className={`h-4 w-4 ${profit >= 0 ? "text-emerald-600" : "text-destructive"}`} />Saldo líquido</div>
          <p className={`mt-2 text-3xl font-bold ${profit >= 0 ? "text-emerald-700" : "text-destructive"}`}>{brl(profit)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Entradas menos saídas registradas.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card p-3">
          <p className="text-sm text-muted-foreground">Hoje</p>
          <p className="mt-1 text-lg font-semibold">{brl(salesPeriodSummary.dailyRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-3">
          <p className="text-sm text-muted-foreground">Semana</p>
          <p className="mt-1 text-lg font-semibold">{brl(salesPeriodSummary.weeklyRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-3">
          <p className="text-sm text-muted-foreground">Mês</p>
          <p className="mt-1 text-lg font-semibold">{brl(salesPeriodSummary.monthlyRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-3">
          <p className="text-sm text-muted-foreground">Meta restante</p>
          <p className={`mt-1 text-lg font-semibold ${remainingToGoal > 0 ? "text-amber-700" : "text-emerald-700"}`}>{brl(remainingToGoal)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2"><CircleAlert className="h-4 w-4 text-primary" /><h2 className="font-semibold">O que precisa de atenção hoje</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {attentionAlerts.map((alert) => (
            <div key={alert.title} className={`rounded-2xl border p-3 ${alert.tone === "danger" ? "border-destructive/30 bg-destructive/10" : alert.tone === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
              <p className="font-semibold">{alert.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="rounded-full">
          <TabsTrigger value="overview" className="rounded-full">Resumo</TabsTrigger>
          <TabsTrigger value="results" className="rounded-full">Resultados</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-full">Gastos</TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-full">Receitas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold">Calculadora de metas</h2><p className="text-sm text-muted-foreground">Descubra o quanto ainda falta para bater a meta e o próximo passo.</p></div>
              <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium">Meta atual: {brl(salesTarget)}</div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Meta de vendas</Label><Input type="number" min="0" value={targetInput} onChange={(e) => setTargetInput(Number(e.target.value))} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Ticket médio por venda</Label><Input type="number" min="0" value={averageTicket} onChange={(e) => setAverageTicket(Number(e.target.value))} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Salvar meta</Label><Button className="w-full rounded-full" onClick={() => { setSalesTarget(targetInput); toast.success("Meta atualizada"); }}>Salvar meta</Button></div>
            </div>
            <div className="mt-4 rounded-2xl bg-secondary/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><span>Progresso da meta</span><span className="font-semibold">{progress.toFixed(1)}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
              <p className="mt-3">Faltam {brl(remainingToGoal)} para alcançar a meta.</p>
              <p className="mt-1">Você precisaria de aproximadamente {salesNeeded} vendas com ticket médio de {brl(averageTicket)} para chegar lá.</p>
              <p className="mt-1">Estimativa de receita com isso: {brl(estimatedRevenue)}.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
              <div className="mb-4">
                <h2 className="font-semibold">Resumo do mês</h2>
                <p className="text-sm text-muted-foreground">Veja em texto os números principais de entrada e saída.</p>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3">
                  <p className="text-sm text-muted-foreground">Receita acumulada</p>
                  <p className="mt-1 text-xl font-semibold">{brl(revenue)}</p>
                  <p className="mt-1 text-sm">Somatório das vendas registradas até o momento.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3">
                  <p className="text-sm text-muted-foreground">Gastos registrados</p>
                  <p className="mt-1 text-xl font-semibold">{brl(totalExpenses)}</p>
                  <p className="mt-1 text-sm">Inclui quantidade, status e observações de cada gasto.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3">
                  <p className="text-sm text-muted-foreground">Meta restante</p>
                  <p className="mt-1 text-xl font-semibold">{brl(remainingToGoal)}</p>
                  <p className="mt-1 text-sm">Você precisa de {salesNeeded} vendas com ticket médio de {brl(averageTicket)} para fechar a meta.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
              <div className="mb-4">
                <h2 className="font-semibold">Gastos por categoria</h2>
                <p className="text-sm text-muted-foreground">Lista textual com o total de cada tipo de gasto.</p>
              </div>
              {categorySummary.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum gasto categorizado ainda.</p> : (
                <div className="space-y-2">
                  {categorySummary.map(({ category, total }) => (
                    <div key={category} className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 p-3">
                      <div>
                        <p className="font-medium">{category}</p>
                        <p className="text-xs text-muted-foreground">Categoria cadastrada no formulário de gastos.</p>
                      </div>
                      <p className="font-semibold">{brl(total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><WalletCards className="h-4 w-4 text-primary" />Resultado líquido</div>
              <p className="mt-2 text-xl font-bold">{brl(profit)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Receitas menos gastos</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowUpRight className="h-4 w-4 text-primary" />Projeção do mês</div>
              <p className="mt-2 text-xl font-bold">{brl(projectedMonthlyRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Com base no restante da meta</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Package2 className="h-4 w-4 text-primary" />Itens em estoque</div>
              <p className="mt-2 text-xl font-bold">{products.filter((product) => product.stock > 0).length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Produtos com saldo ativo</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />Calendário</div>
              <p className="mt-2 text-xl font-bold">{calendarDays.filter((day) => day.events > 0).length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Dias com movimentação</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Estoque</h2>
                <span className="text-sm text-muted-foreground">Alertas de baixa quantidade</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="py-2">Produto</th>
                      <th className="py-2">Estoque</th>
                      <th className="py-2">Encomenda</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryRows.map((product) => (
                      <tr key={product.id} className="border-b border-border/40">
                        <td className="py-2 font-medium">{product.name}</td>
                        <td className="py-2">{product.stock}</td>
                        <td className="py-2">{product.orderBalance ?? 0}</td>
                        <td className="py-2"><Badge className={product.stock <= 0 ? "bg-destructive/10 text-destructive" : product.stock <= 5 ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/10 text-emerald-700"}>{product.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Histórico financeiro</h2>
                <div className="flex flex-wrap gap-2">
                  <Select value={historyRange} onValueChange={(value) => setHistoryRange(value as "all" | "today" | "week" | "month")}>
                    <SelectTrigger className="h-8 w-24 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Semana</SelectItem>
                      <SelectItem value="month">Mês</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={historyCategory} onValueChange={setHistoryCategory}>
                    <SelectTrigger className="h-8 w-32 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {Array.from(new Set(expenses.map((expense) => expense.category?.trim()).filter(Boolean))).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="mb-3 rounded-xl" placeholder="Buscar gasto" />
              <div className="space-y-2">
                {filteredExpenses.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">Nenhum gasto encontrado para os filtros.</p> : filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 p-3">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{expense.category} · {expense.paidAt} · qtd {expense.quantity ?? 1}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{brl(expense.amount * (expense.quantity ?? 1))}</p>
                      <Badge variant="secondary">{expense.status ?? "pendente"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Gastos registrados</h2><span className="text-sm text-muted-foreground">Tabela detalhada</span></div>
            {expenses.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum gasto registrado ainda.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="py-2">Descrição</th>
                      <th className="py-2">Categoria</th>
                      <th className="py-2">Qtd</th>
                      <th className="py-2">Valor</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-border/40 align-top">
                        <td className="py-2 font-medium">{expense.description}</td>
                        <td className="py-2">{expense.category}</td>
                        <td className="py-2">{expense.quantity ?? 1}</td>
                        <td className="py-2">{brl(expense.amount * (expense.quantity ?? 1))}</td>
                        <td className="py-2"><Badge variant="secondary">{expense.status ?? "pendente"}</Badge></td>
                        <td className="py-2"><Button size="icon" variant="ghost" className="rounded-full" onClick={() => deleteExpense(expense.id)}><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2"><CircleAlert className="h-4 w-4 text-primary" /><h2 className="font-semibold">Adicionar gasto</h2></div>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Descrição</Label><Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="rounded-xl" placeholder="Ex.: Ingredientes" /></div>
              <div className="space-y-2"><Label>Categoria</Label><Input value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="rounded-xl" placeholder="Ex.: Ingredientes" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Valor unitário (R$)</Label><Input type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="1" step="1" value={expenseForm.quantity ?? 1} onChange={(e) => setExpenseForm({ ...expenseForm, quantity: Number(e.target.value) || 1 })} className="rounded-xl" /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Status</Label><Select value={expenseForm.status ?? "pendente"} onValueChange={(value) => setExpenseForm({ ...expenseForm, status: value as ExpenseEntry["status"] })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="parcial">Parcial</SelectItem><SelectItem value="pago">Pago</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={expenseForm.paidAt} onChange={(e) => setExpenseForm({ ...expenseForm, paidAt: e.target.value })} className="rounded-xl" /></div>
              </div>
              <div className="space-y-2"><Label>Retorno esperado</Label><Input type="date" value={expenseForm.expectedReturnAt ?? ""} onChange={(e) => setExpenseForm({ ...expenseForm, expectedReturnAt: e.target.value })} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Lucro estimado</Label><Input type="number" min="0" step="0.01" value={expenseForm.expectedProfit ?? 0} onChange={(e) => setExpenseForm({ ...expenseForm, expectedProfit: Number(e.target.value) })} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={expenseForm.notes ?? ""} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} className="rounded-xl" /></div>
              <Button className="w-full rounded-full" onClick={async () => { if (!expenseForm.description.trim()) { toast.error("Descreva o gasto"); return; } await addExpense(expenseForm); setExpenseForm({ description: "", amount: 0, category: "", quantity: 1, status: "pendente", paidAt: new Date().toISOString().slice(0, 10), expectedReturnAt: "", expectedProfit: 0, notes: "" }); toast.success("Gasto adicionado"); }}>Adicionar gasto</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Receitas registradas</h2><span className="text-sm text-muted-foreground">Entradas manuais de caixa</span></div>
            {revenues.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma receita registrada ainda.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="py-2">Descrição</th>
                      <th className="py-2">Categoria</th>
                      <th className="py-2">Valor</th>
                      <th className="py-2">Data</th>
                      <th className="py-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenues.map((revenueEntry) => (
                      <tr key={revenueEntry.id} className="border-b border-border/40 align-top">
                        <td className="py-2 font-medium">{revenueEntry.description}</td>
                        <td className="py-2">{revenueEntry.category}</td>
                        <td className="py-2">{brl(revenueEntry.amount)}</td>
                        <td className="py-2">{revenueEntry.receivedAt}</td>
                        <td className="py-2"><Button size="icon" variant="ghost" className="rounded-full" onClick={() => deleteRevenue(revenueEntry.id)}><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-primary" /><h2 className="font-semibold">Adicionar receita</h2></div>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Descrição</Label><Input value={revenueForm.description} onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })} className="rounded-xl" placeholder="Ex.: Recebimento de venda" /></div>
              <div className="space-y-2"><Label>Categoria / Origem</Label><Input value={revenueForm.category} onChange={(e) => setRevenueForm({ ...revenueForm, category: e.target.value })} className="rounded-xl" placeholder="Ex.: Pix, Delivery, Cliente" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={revenueForm.amount} onChange={(e) => setRevenueForm({ ...revenueForm, amount: Number(e.target.value) })} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={revenueForm.receivedAt} onChange={(e) => setRevenueForm({ ...revenueForm, receivedAt: e.target.value })} className="rounded-xl" /></div>
              </div>
              <div className="space-y-2"><Label>Status</Label><Select value={revenueForm.status ?? "recebida"} onValueChange={(value) => setRevenueForm({ ...revenueForm, status: value as RevenueEntry["status"] })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recebida">Recebida</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="parcial">Parcial</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={revenueForm.notes ?? ""} onChange={(e) => setRevenueForm({ ...revenueForm, notes: e.target.value })} className="rounded-xl" /></div>
              <Button className="w-full rounded-full" onClick={async () => { if (!revenueForm.description.trim()) { toast.error("Descreva a receita"); return; } await addRevenue(revenueForm); setRevenueForm({ description: "", amount: 0, category: "", receivedAt: new Date().toISOString().slice(0, 10), status: "recebida", notes: "" }); toast.success("Receita adicionada"); }}>Adicionar receita</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
