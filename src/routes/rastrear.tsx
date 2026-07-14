import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rastrear")({
  component: TrackOrder,
});

function TrackOrder() {
  const navigate = useNavigate();
  const { orders } = useStore();
  const [whatsapp, setWhatsapp] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!whatsapp.trim() || !orderCode.trim()) {
      toast.error("Digite seu WhatsApp e o código do pedido");
      return;
    }

    setLoading(true);

    // Normalize whatsapp (remove special chars)
    const normalizedInput = whatsapp.replace(/\D/g, "");
    const normalizedSearchWhatsapp = normalizedInput.slice(-11); // Get last 11 digits (BR phone format)

    // Find matching order
    const order = orders.find((o) => {
      const normalizedOrderWhatsapp = o.whatsapp.replace(/\D/g, "").slice(-11);
      return normalizedOrderWhatsapp === normalizedSearchWhatsapp && o.orderCode === orderCode.toUpperCase();
    });

    setLoading(false);

    if (order) {
      navigate({ to: `/pedido/${order.id}` });
      toast.success("Pedido encontrado!");
    } else {
      toast.error("Pedido não encontrado. Verifique os dados e tente novamente.");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Rastrear Pedido</CardTitle>
          <CardDescription>Insira seus dados para encontrar seu pedido</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="rounded-xl"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orderCode">Código do Pedido</Label>
            <Input
              id="orderCode"
              type="text"
              placeholder="ABC123"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
              className="rounded-xl"
              disabled={loading}
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">Você recebeu este código por WhatsApp após confirmar sua encomenda</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => navigate({ to: "/" })}
              variant="outline"
              className="w-full rounded-full"
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              onClick={handleSearch}
              className="w-full rounded-full"
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar Pedido"}
            </Button>
          </div>

          <div className="mt-6 flex gap-2 rounded-lg border border-amber-200/50 bg-amber-50 p-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Dúvida com seu código?</p>
              <p className="mt-1">Entre em contato conosco pelo WhatsApp e faremos a busca para você!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
