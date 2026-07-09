import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem, Order, OrderStatus, Product } from "./types";
import { uid } from "./format";
import { sendOrderToTelegram } from "./telegram";

const KEY_PRODUCTS = "sdp:products";
const KEY_CART = "sdp:cart";
const KEY_ORDERS = "sdp:orders";
const KEY_ADMIN = "sdp:admin";

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: uid(),
    name: "Coxinha de Frango",
    description: "Massa dourada e crocante recheada com frango cremoso e temperado.",
    imageUrl:
      "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800&auto=format&fit=crop",
    price: 5.5,
    stock: 40,
  },
  {
    id: uid(),
    name: "Kibe Recheado",
    description: "Kibe crocante recheado com queijo derretido. Uma delícia irresistível.",
    imageUrl:
      "https://images.unsplash.com/photo-1626200419199-391ae4be7f9d?w=800&auto=format&fit=crop",
    price: 6.0,
    stock: 25,
  },
  {
    id: uid(),
    name: "Empada de Palmito",
    description: "Massa amanteigada com recheio suave de palmito fresco.",
    imageUrl:
      "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&auto=format&fit=crop",
    price: 5.0,
    stock: 30,
  },
  {
    id: uid(),
    name: "Enroladinho de Salsicha",
    description: "Massa fofinha envolvendo salsicha suculenta, sucesso garantido.",
    imageUrl:
      "https://images.unsplash.com/photo-1619221882220-947b3d3c8861?w=800&auto=format&fit=crop",
    price: 4.5,
    stock: 0,
  },
  {
    id: uid(),
    name: "Pastel de Queijo",
    description: "Pastel sequinho e crocante, recheado com muito queijo derretido.",
    imageUrl:
      "https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=800&auto=format&fit=crop",
    price: 6.5,
    stock: 20,
  },
  {
    id: uid(),
    name: "Bolinha de Queijo",
    description: "Clássico irresistível, macia por dentro e crocante por fora.",
    imageUrl:
      "https://images.unsplash.com/photo-1606502281004-f4d47ea1d0a4?w=800&auto=format&fit=crop",
    price: 4.0,
    stock: 60,
  },
];

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

type Ctx = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  isAdmin: boolean;

  // products
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // cart
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;

  // orders
  createOrder: (data: { customerName: string; whatsapp: string; notes: string }) => Order;
  updateOrderStatus: (id: string, status: OrderStatus, scheduledAt?: string) => void;

  // admin
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProducts(load<Product[]>(KEY_PRODUCTS, DEFAULT_PRODUCTS));
    setCart(load<CartItem[]>(KEY_CART, []));
    setOrders(load<Order[]>(KEY_ORDERS, []));
    setIsAdmin(load<boolean>(KEY_ADMIN, false));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) save(KEY_PRODUCTS, products); }, [products, hydrated]);
  useEffect(() => { if (hydrated) save(KEY_CART, cart); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) save(KEY_ORDERS, orders); }, [orders, hydrated]);
  useEffect(() => { if (hydrated) save(KEY_ADMIN, isAdmin); }, [isAdmin, hydrated]);

  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart],
  );
  const cartCount = useMemo(
    () => cart.reduce((s, i) => s + i.quantity, 0),
    [cart],
  );

  const value: Ctx = {
    products,
    cart,
    orders,
    isAdmin,
    cartTotal,
    cartCount,

    addProduct: (p) => setProducts((prev) => [...prev, { ...p, id: uid() }]),
    updateProduct: (id, patch) =>
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    deleteProduct: (id) => setProducts((prev) => prev.filter((p) => p.id !== id)),

    addToCart: (product, qty = 1) =>
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        const maxQty = product.stock;
        if (existing) {
          const nextQty = Math.min(existing.quantity + qty, maxQty);
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: nextQty } : i,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            price: product.price,
            quantity: Math.min(qty, maxQty),
          },
        ];
      }),

    removeFromCart: (productId) =>
      setCart((prev) => prev.filter((i) => i.productId !== productId)),

    setQuantity: (productId, qty) =>
      setCart((prev) =>
        prev
          .map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
          .filter((i) => i.quantity > 0),
      ),

    clearCart: () => setCart([]),

    createOrder: ({ customerName, whatsapp, notes }) => {
      const order: Order = {
        id: uid(),
        customerName,
        whatsapp,
        notes,
        items: cart,
        total: cartTotal,
        status: "recebido",
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => [order, ...prev]);
      // decrementa estoque
      setProducts((prev) =>
        prev.map((p) => {
          const inCart = cart.find((c) => c.productId === p.id);
          return inCart ? { ...p, stock: Math.max(0, p.stock - inCart.quantity) } : p;
        }),
      );
      setCart([]);
      void sendOrderToTelegram(order);
      return order;
    },

    updateOrderStatus: (id, status, scheduledAt) =>
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status, scheduledAt } : o)),
      ),

    loginAdmin: (password) => {
      const ok = password === "40023265a";
      if (ok) setIsAdmin(true);
      return ok;
    },
    logoutAdmin: () => setIsAdmin(false),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
