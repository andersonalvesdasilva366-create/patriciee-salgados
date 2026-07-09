import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { brl, formatDateTime } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/lib/types";
import { Edit, LogOut, Plus, Trash2 } from "lucide-react";
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
          <p className="mt-1 text-sm text-muted-foreground">
            Entre para gerenciar produtos e pedidos.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loginAdmin(pwd)) toast.error("Senha incorreta");
            }}
            className="mt-6 space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha</Label>
              <Input
                id="pwd"
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="rounded-xl"
                placeholder="Digite a senha"
              />
            </div>
            <Button type="submit" className="w-full rounded-full">Entrar</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Gerencie produtos e pedidos</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={logoutAdmin}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="rounded-full">
          <TabsTrigger value="orders" className="rounded-full">Pedidos</TabsTrigger>
          <TabsTrigger value="products" className="rounded-full">Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <OrdersPanel />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductsPanel />
        </TabsContent>
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
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-card"
                : "bg-secondary text-foreground/70 hover:bg-secondary/70"
            }`}
          >
            {f === "all" ? "Todos" : f === "pendentes" ? "Pendentes" : f === "concluidos" ? "Concluídos" : "Enviados"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhum pedido nesta categoria.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
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
          <p className="text-sm text-muted-foreground">
            {order.whatsapp} · {formatDateTime(order.createdAt)} · #{order.id.slice(0, 6).toUpperCase()}
          </p>
        </div>
        <span className="text-lg font-bold text-primary">{brl(order.total)}</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {order.items.map((i) => (
          <li key={i.productId} className="rounded-full bg-secondary px-2.5 py-1">
            {i.name} × {i.quantity}
          </li>
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
          <Select
            value={order.status}
            onValueChange={(v) => updateOrderStatus(order.id, v as OrderStatus, v === "agendado" ? scheduled || undefined : undefined)}
          >
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
            <Input
              type="datetime-local"
              value={scheduled ? scheduled.slice(0, 16) : ""}
              onChange={(e) => {
                const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                setScheduled(iso);
                updateOrderStatus(order.id, "agendado", iso || undefined);
              }}
              className="rounded-xl"
            />
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

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full" onClick={() => setEditing(null)}>
              <Plus className="mr-1 h-4 w-4" /> Novo produto
            </Button>
          </DialogTrigger>
          <ProductDialog
            product={editing}
            onSubmit={(data) => {
              if (editing) {
                updateProduct(editing.id, data);
                toast.success("Produto atualizado");
              } else {
                addProduct(data);
                toast.success("Produto adicionado");
              }
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhum produto cadastrado.
        </p>
      ) : (
        <ul className="grid gap-3">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3 shadow-card">
              <img src={p.imageUrl} alt={p.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {brl(p.price)} · estoque: {p.stock} · encomenda: {p.orderBalance ?? 0}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => { setEditing(p); setOpen(true); }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Excluir "${p.name}"?`)) {
                      deleteProduct(p.id);
                      toast.success("Produto excluído");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductDialog({
  product,
  onSubmit,
}: {
  product: Product | null;
  onSubmit: (data: Omit<Product, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Product, "id">>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    imageUrl: product?.imageUrl ?? "",
    price: product?.price ?? 0,
    stock: product?.stock ?? 0,
    orderBalance: product?.orderBalance ?? 0,
  });


  return (
    <DialogContent className="rounded-3xl">
      <DialogHeader>
        <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim() || !form.imageUrl.trim()) {
            toast.error("Preencha nome e imagem");
            return;
          }
          onSubmit({
            ...form,
            name: form.name.trim(),
            description: form.description.trim(),
            imageUrl: form.imageUrl.trim(),
            price: Number(form.price) || 0,
            stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
            orderBalance: Math.max(0, Math.floor(Number(form.orderBalance) || 0)),
          });
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>URL da imagem</Label>
          <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="rounded-xl" placeholder="https://..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Preço (R$)</Label>
            <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Saldo de estoque</Label>
            <Input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="rounded-xl" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Saldo de encomenda</Label>
          <Input type="number" min="0" step="1" value={form.orderBalance ?? 0} onChange={(e) => setForm({ ...form, orderBalance: Number(e.target.value) })} className="rounded-xl" />
        </div>
        <DialogFooter>
          <Button type="submit" className="rounded-full">Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
