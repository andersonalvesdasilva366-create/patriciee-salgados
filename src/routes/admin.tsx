import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import type { ExpenseEntry, Order, OrderStatus, Product } from "@/lib/types";
import { CheckCircle2, CircleDollarSign, Edit, LogOut, MessageSquareText, Package2, Plus, Receipt, Sparkles, Trash2, TrendingUp, XCircle } from "lucide-react";
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
  const { isAdmin, loginAdmin, logoutAdmin } = useStore();
  const [pwd, setPwd] = useState("");

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-warm">
          <h1 className="font-display text-2xl font-bold">Área Administrativa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre para gerenciar produtos, pedidos e finanças.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loginAdmin(pwd)) toast.error("Senha incorreta");
            }}
            className="mt-6 space-y-4"
          >
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
        <Button variant="outline" className="rounded-full" onClick={logoutAdmin}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="rounded-full">
          <TabsTrigger value="orders" className="rounded-full">Pedidos</TabsTrigger>
          <TabsTrigger value="products" className="rounded-full">Produtos</TabsTrigger>
          <TabsTrigger value="feedbacks" className="rounded-full">Comentários</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-full">Vendas & Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6"><OrdersPanel /></TabsContent>
        <TabsContent value="products" className="mt-6"><ProductsPanel /></TabsContent>
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

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{order.customerName}</span>
            <Badge className={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{order.whatsapp} · {formatDateTime(order.createdAt)} · #{order.id.slice(0, 6).toUpperCase()}</p>
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
          <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v as OrderStatus, v === "agendado" ? scheduled || undefined : undefined)}>
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
            <Input type="datetime-local" value={scheduled ? scheduled.slice(0, 16) : ""} onChange={(e) => { const iso = e.target.value ? new Date(e.target.value).toISOString() : ""; setScheduled(iso); updateOrderStatus(order.id, "agendado", iso || undefined); }} className="rounded-xl" />
          </div>
        )}
      </div>
      {order.feedback && (
        <div className="mt-4 rounded-2xl bg-secondary/50 p-3 text-sm text-foreground">
          <p className="font-medium">Feedback do cliente:</p>
          <p className="whitespace-pre-line">{order.feedback}</p>
        </div>
      )}
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
    promotion: product?.promotion ?? false,
    offerLabel: product?.offerLabel ?? "",
    highlightDescription: product?.highlightDescription ?? "",
    featured: product?.featured ?? false,
  });

  return (
    <DialogContent className="rounded-3xl">
      <DialogHeader><DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
      <form onSubmit={async (e) => { e.preventDefault(); if (!form.name.trim() || !form.imageUrl.trim()) { toast.error("Preencha nome e imagem"); return; } await onSubmit({ ...form, name: form.name.trim(), description: form.description.trim(), imageUrl: form.imageUrl.trim(), price: Number(form.price) || 0, stock: Math.max(0, Math.floor(Number(form.stock) || 0)), orderBalance: Math.max(0, Math.floor(Number(form.orderBalance) || 0)), offerLabel: form.offerLabel?.trim() ?? "", highlightDescription: form.highlightDescription?.trim() ?? "", featured: Boolean(form.featured), }); }} className="space-y-4">
        <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" /></div>
        <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" /></div>
        <div className="space-y-2"><Label>URL da imagem</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="rounded-xl" placeholder="https://..." /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="rounded-xl" /></div>
          <div className="space-y-2"><Label>Saldo de estoque</Label><Input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="rounded-xl" /></div>
        </div>
        <div className="space-y-2"><Label>Saldo de encomenda</Label><Input type="number" min="0" step="1" value={form.orderBalance ?? 0} onChange={(e) => setForm({ ...form, orderBalance: Number(e.target.value) })} className="rounded-xl" /></div>
        <div className="space-y-2"><Label>Oferta / Destaque</Label><Input value={form.offerLabel ?? ""} onChange={(e) => setForm({ ...form, offerLabel: e.target.value })} className="rounded-xl" placeholder="Ex.: Oferta do dia" /></div>
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

function FeedbacksPanel() {
  const { feedbacks, approveFeedback } = useStore();
  const pending = feedbacks.filter((item) => !item.approved);
  const approved = feedbacks.filter((item) => item.approved);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-primary" /><h2 className="font-semibold">Pendentes para aprovação</h2></div>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum comentário aguardando revisão.</p> : <div className="space-y-3">{pending.map((item) => <div key={item.id} className="rounded-2xl border border-border/60 bg-secondary/40 p-3"> <div className="flex items-center justify-between gap-2"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.isBot ? "Bot" : "Cliente"} · {formatDateTime(item.createdAt)}</p></div>{item.isBot ? <Badge className="bg-primary/10 text-primary">Bot</Badge> : <Badge variant="secondary">Cliente</Badge>}</div><p className="mt-2 text-sm text-foreground">{item.comment}</p><div className="mt-3 flex gap-2"><Button size="sm" className="rounded-full" onClick={() => approveFeedback(item.id, true)}><CheckCircle2 className="mr-1 h-4 w-4" />Aprovar</Button><Button size="sm" variant="outline" className="rounded-full" onClick={() => approveFeedback(item.id, false)}><XCircle className="mr-1 h-4 w-4" />Rejeitar</Button></div></div>)}</div>}
      </div>
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="font-semibold">Comentários aprovados</h2></div>
        {approved.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há comentários públicos.</p> : <div className="space-y-3">{approved.map((item) => <div key={item.id} className="rounded-2xl border border-border/60 bg-secondary/40 p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium">{item.name}</p>{item.isBot ? <Badge className="bg-primary/10 text-primary">Bot</Badge> : <Badge variant="secondary">Cliente</Badge>}</div><p className="mt-2 text-sm">{item.comment}</p></div>)}</div>}
      </div>
    </div>
  );
}

function FinancePanel() {
  const { orders, expenses, salesTarget, setSalesTarget, addExpense, deleteExpense } = useStore();
  const [targetInput, setTargetInput] = useState(salesTarget);
  const [averageTicket, setAverageTicket] = useState(60);
  const [expenseForm, setExpenseForm] = useState<Omit<ExpenseEntry, "id">>({ description: "", amount: 0, category: "", paidAt: new Date().toISOString().slice(0, 10), expectedReturnAt: "", expectedProfit: 0, notes: "" });

  const revenue = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  const soldUnits = useMemo(() => orders.reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0), [orders]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const profit = revenue - totalExpenses;
  const progress = salesTarget > 0 ? Math.min(100, (revenue / salesTarget) * 100) : 0;
  const remainingToGoal = Math.max(0, salesTarget - revenue);
  const salesNeeded = averageTicket > 0 ? Math.max(0, Math.ceil(remainingToGoal / averageTicket)) : 0;
  const estimatedRevenue = revenue + salesNeeded * averageTicket;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleDollarSign className="h-4 w-4 text-primary" />Receita</div><p className="mt-2 text-2xl font-bold">{brl(revenue)}</p></div>
        <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Package2 className="h-4 w-4 text-primary" />Unidades vendidas</div><p className="mt-2 text-2xl font-bold">{soldUnits}</p></div>
        <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Receipt className="h-4 w-4 text-primary" />Gastos</div><p className="mt-2 text-2xl font-bold">{brl(totalExpenses)}</p></div>
        <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card"><div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-primary" />Lucro</div><p className="mt-2 text-2xl font-bold">{brl(profit)}</p></div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Calculadora de metas</h2><p className="text-sm text-muted-foreground">Descubra quantas vendas ainda faltam para bater a meta.</p></div>
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium">Meta atual: {brl(salesTarget)}</div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label>Meta de vendas</Label><Input type="number" min="0" value={targetInput} onChange={(e) => setTargetInput(Number(e.target.value))} className="rounded-xl" /></div>
          <div className="space-y-2"><Label>Ticket médio por venda</Label><Input type="number" min="0" value={averageTicket} onChange={(e) => setAverageTicket(Number(e.target.value))} className="rounded-xl" /></div>
          <div className="space-y-2"><Label>Salvar meta</Label><Button className="w-full rounded-full" onClick={() => { setSalesTarget(targetInput); toast.success("Meta atualizada"); }}>Salvar meta</Button></div>
        </div>
        <div className="mt-4 rounded-2xl bg-secondary/40 p-3 text-sm">
          <p>Faltam {brl(remainingToGoal)} para alcançar a meta.</p>
          <p className="mt-1">Você precisaria de aproximadamente {salesNeeded} vendas com ticket médio de {brl(averageTicket)} para chegar lá.</p>
          <p className="mt-1">Estimativa de receita com isso: {brl(estimatedRevenue)}.</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Gastos registrados</h2><span className="text-sm text-muted-foreground">Controle os custos e lucros</span></div>
          {expenses.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum gasto registrado ainda.</p> : <ul className="space-y-2">{expenses.map((expense) => <li key={expense.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 p-3"><div><p className="font-medium">{expense.description}</p><p className="text-xs text-muted-foreground">{expense.category} · {expense.paidAt}</p></div><div className="flex items-center gap-2"><span className="font-semibold">{brl(expense.amount)}</span><Button size="icon" variant="ghost" className="rounded-full" onClick={() => deleteExpense(expense.id)}><Trash2 className="h-4 w-4" /></Button></div></li>)}</ul>}
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <h2 className="font-semibold">Adicionar gasto</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-2"><Label>Descrição</Label><Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="rounded-xl" placeholder="Ex.: Ingredientes" /></div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="rounded-xl" placeholder="Ex.: Ingredientes" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={expenseForm.paidAt} onChange={(e) => setExpenseForm({ ...expenseForm, paidAt: e.target.value })} className="rounded-xl" /></div>
            </div>
            <div className="space-y-2"><Label>Retorno esperado</Label><Input type="date" value={expenseForm.expectedReturnAt ?? ""} onChange={(e) => setExpenseForm({ ...expenseForm, expectedReturnAt: e.target.value })} className="rounded-xl" /></div>
            <div className="space-y-2"><Label>Lucro estimado</Label><Input type="number" min="0" step="0.01" value={expenseForm.expectedProfit ?? 0} onChange={(e) => setExpenseForm({ ...expenseForm, expectedProfit: Number(e.target.value) })} className="rounded-xl" /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={expenseForm.notes ?? ""} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} className="rounded-xl" /></div>
            <Button className="w-full rounded-full" onClick={async () => { if (!expenseForm.description.trim()) { toast.error("Descreva o gasto"); return; } await addExpense(expenseForm); setExpenseForm({ description: "", amount: 0, category: "", paidAt: new Date().toISOString().slice(0, 10), expectedReturnAt: "", expectedProfit: 0, notes: "" }); toast.success("Gasto adicionado"); }}>Adicionar gasto</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
