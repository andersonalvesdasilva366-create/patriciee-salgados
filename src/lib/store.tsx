import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem, Order, OrderStatus, Product } from "./types";
import { uid } from "./format";
import { sendOrderToTelegram } from "./telegram";

const KEY_PRODUCTS = "sdp:products";
const KEY_CART = "sdp:cart";
const KEY_ORDERS = "sdp:orders";
const KEY_ADMIN = "sdp:admin";

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
  addToCart: (product: Product, qty?: number, deliveryDate?: string, kind?: "stock" | "order") => void;
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
    setProducts(load<Product[]>(KEY_PRODUCTS, []));
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

    addToCart: (product, qty = 1, deliveryDate?: string, kind: "stock" | "order" = "stock") =>
      setCart((prev) => {
        const maxQty = kind === "order" ? (product.orderBalance ?? 0) : product.stock;
        if (maxQty <= 0) return prev;

        const existing = prev.find((i) => i.productId === product.id && i.kind === kind && i.deliveryDate === deliveryDate);
        if (existing) {
          const nextQty = Math.min(existing.quantity + qty, maxQty);
          return prev.map((i) =>
            i.productId === product.id && i.kind === kind && i.deliveryDate === deliveryDate ? { ...i, quantity: nextQty } : i,
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
            ...(deliveryDate && { deliveryDate }),
            kind,
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
      setProducts((prev) =>
        prev.map((p) => {
          const inCart = cart.filter((c) => c.productId === p.id);
          const stockUsed = inCart.filter((c) => c.kind !== "order").reduce((sum, c) => sum + c.quantity, 0);
          const orderUsed = inCart.filter((c) => c.kind === "order").reduce((sum, c) => sum + c.quantity, 0);
          return {
            ...p,
            stock: Math.max(0, p.stock - stockUsed),
            orderBalance: Math.max(0, (p.orderBalance ?? 0) - orderUsed),
          };
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
