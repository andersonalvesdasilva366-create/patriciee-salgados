export type Product = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  stock: number;
};

export type CartItem = {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  deliveryDate?: string; // ISO date (YYYY-MM-DD)
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
};
