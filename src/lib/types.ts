export type ProductMediaType = "image" | "video";

export type Product = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  stock: number;
  orderBalance?: number; // Saldo disponível para encomenda
  partner?: boolean;
  promotion?: boolean;
  offerLabel?: string;
  highlightDescription?: string;
  featured?: boolean;
  mediaUrl?: string;
  mediaType?: ProductMediaType;
};

export type ProductFeedback = {
  id: string;
  productId: string;
  name: string;
  comment: string;
  approved: boolean;
  isBot: boolean;
  createdAt: string;
};

export type RevenueEntry = {
  id: string;
  description: string;
  amount: number;
  category: string;
  receivedAt: string;
  status?: "recebida" | "pendente" | "parcial";
  notes?: string;
};

export type ExpenseEntry = {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidAt: string;
  expectedReturnAt?: string;
  expectedProfit?: number;
  notes?: string;
  quantity?: number;
  status?: "pendente" | "pago" | "parcial";
};

export type CartItem = {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  deliveryDate?: string; // ISO date (YYYY-MM-DD)
  kind?: "stock" | "order";
  partner?: boolean;
};

export type OrderStatus =
  | "recebido"
  | "encomendado"
  | "agendado"
  | "enviado";

export type Order = {
  id: string;
  customerName: string;
  whatsapp: string;
  notes: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  scheduledAt?: string; // ISO datetime when status === "agendado"
  createdAt: string;
  feedback?: string;
};
