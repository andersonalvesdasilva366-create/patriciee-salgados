import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem, ExpenseEntry, Order, OrderStatus, Product, ProductFeedback } from "./types";
import { uid } from "./format";
import { sendOrderToTelegram } from "./telegram";
import { supabase } from "./supabase";

const KEY_CART = "sdp:cart";
const KEY_ADMIN = "sdp:admin";
const KEY_FEEDBACKS = "sdp:feedbacks";
const KEY_EXPENSES = "sdp:expenses";
const KEY_SALES_TARGET = "sdp:salesTarget";

const DEFAULT_FEEDBACKS: ProductFeedback[] = [
  {
    id: "bot-1",
    productId: "__global__",
    name: "Bot • Paty",
    comment: "Entrega rápida e sabor impecável!",
    approved: true,
    isBot: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "bot-2",
    productId: "__global__",
    name: "Bot • Paty",
    comment: "Produtos sempre bem embalados e com ótimo atendimento.",
    approved: true,
    isBot: true,
    createdAt: new Date().toISOString(),
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
  feedbacks: ProductFeedback[];
  expenses: ExpenseEntry[];
  salesTarget: number;

  // products
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // cart
  addToCart: (product: Product, qty?: number, deliveryDate?: string, kind?: "stock" | "order") => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;

  // orders
  createOrder: (data: { customerName: string; whatsapp: string; notes: string }) => Promise<Order | undefined>;
  updateOrderStatus: (id: string, status: OrderStatus, scheduledAt?: string) => Promise<void>;
  submitOrderFeedback: (id: string, feedback: string) => Promise<void>;

  // admin
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  submitProductFeedback: (productId: string, name: string, comment: string) => Promise<void>;
  approveFeedback: (id: string, approved: boolean) => Promise<void>;
  addExpense: (expense: Omit<ExpenseEntry, "id">) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setSalesTarget: (value: number) => void;
};

const StoreContext = createContext<Ctx | null>(null);

function normalizeProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    imageUrl: String(
      (row.imageUrl as string | undefined) ??
        (row.imageurl as string | undefined) ??
        (row.image_url as string | undefined) ??
        "",
    ),
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    orderBalance: Number(
      (row.orderBalance as number | undefined) ??
        (row.orderbalance as number | undefined) ??
        (row.order_balance as number | undefined) ??
        0,
    ),
    partner: Boolean(
      (row.partner as boolean | undefined) ??
        (row.Partner as boolean | undefined) ??
        (row.partner as number | undefined) ??
        false,
    ),
    promotion: Boolean(
      (row.promotion as boolean | undefined) ??
        (row.Promotion as boolean | undefined) ??
        (row.promotion as number | undefined) ??
        false,
    ),
    offerLabel: String(
      (row.offerLabel as string | undefined) ??
        (row.offerlabel as string | undefined) ??
        (row.offer_label as string | undefined) ??
        "",
    ),
    highlightDescription: String(
      (row.highlightDescription as string | undefined) ??
        (row.highlightdescription as string | undefined) ??
        (row.highlight_description as string | undefined) ??
        "",
    ),
    featured: Boolean(
      (row.featured as boolean | undefined) ??
        (row.Featured as boolean | undefined) ??
        (row.featured as number | undefined) ??
        false,
    ),
  };
}

function buildProductPayload(
  values: Partial<Product> & { name?: string; description?: string; imageUrl?: string | null; price?: number; stock?: number; orderBalance?: number | null; partner?: boolean; promotion?: boolean; offerLabel?: string; highlightDescription?: string; featured?: boolean },
  variant: "camel" | "lower" | "snake",
) {
  const imageKey = variant === "camel" ? "imageUrl" : variant === "lower" ? "imageurl" : "image_url";
  const orderBalanceKey = variant === "camel" ? "orderBalance" : variant === "lower" ? "orderbalance" : "order_balance";
  const partnerKey = "partner";
  const promotionKey = "promotion";

  return {
    ...(values.name !== undefined && { name: values.name }),
    ...(values.description !== undefined && { description: values.description }),
    ...(values.imageUrl !== undefined && { [imageKey]: values.imageUrl }),
    ...(values.price !== undefined && { price: values.price }),
    ...(values.stock !== undefined && { stock: values.stock }),
    ...(values.orderBalance !== undefined && { [orderBalanceKey]: values.orderBalance }),
    ...(values.partner !== undefined && { [partnerKey]: values.partner }),
    ...(values.promotion !== undefined && { [promotionKey]: values.promotion }),
  };
}

async function writeProductWithFallback(
  operation: "insert" | "update",
  values: Partial<Product> & { name?: string; description?: string; imageUrl?: string | null; price?: number; stock?: number; orderBalance?: number | null; partner?: boolean; promotion?: boolean; offerLabel?: string; highlightDescription?: string; featured?: boolean },
  id?: string,
) {
  const payloads = [
    buildProductPayload(values, "lower"),
    buildProductPayload(values, "camel"),
    buildProductPayload(values, "snake"),
  ];

  let lastError: unknown;
  for (const payload of payloads) {
    const baseQuery =
      operation === "insert"
        ? supabase.from("products").insert([payload])
        : supabase.from("products").update(payload).eq("id", id ?? "");

    const { error } = await baseQuery.select();
    if (!error) return { error: null };

    lastError = error;
    const message = typeof error.message === "string" ? error.message : "";
    if (!/column/i.test(message)) break;
  }

  return { error: lastError };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedbacks, setFeedbacks] = useState<ProductFeedback[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [salesTarget, setSalesTarget] = useState(5000);
  const [hydrated, setHydrated] = useState(false);

  // Load cart and admin from localStorage
  useEffect(() => {
    setCart(load<CartItem[]>(KEY_CART, []));
    setIsAdmin(load<boolean>(KEY_ADMIN, false));
    setFeedbacks(load<ProductFeedback[]>(KEY_FEEDBACKS, DEFAULT_FEEDBACKS));
    setExpenses(load<ExpenseEntry[]>(KEY_EXPENSES, []));
    setSalesTarget(load<number>(KEY_SALES_TARGET, 5000));
    setHydrated(true);
  }, []);

  // Load products from Supabase
  const loadProducts = async () => {
    if (typeof window === "undefined") return;
    try {
      const { data, error } = await supabase.from("products").select("*");
      if (error) {
        console.error("Error loading products:", error);
        return;
      }
      setProducts((data || []).map(normalizeProduct));
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  // Load orders from Supabase
  const loadOrders = async () => {
    if (typeof window === "undefined") return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("createdat", { ascending: false });
      if (error) {
        console.error("Error loading orders:", error);
        return;
      }
          setOrders(
        (data || []).map((order) => ({
          id: order.id,
          customerName: order.customername,
          whatsapp: order.whatsapp,
          notes: order.notes,
          items: order.items,
          total: order.total,
          status: order.status,
          createdAt: order.createdat,
          scheduledAt: order.scheduledat,
          feedback: order.feedback ?? undefined,
        })),
      );
    } catch (err) {
      console.error("Error loading orders:", err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (hydrated) save(KEY_CART, cart);
  }, [cart, hydrated]);

  // Save admin to localStorage
  useEffect(() => {
    if (hydrated) save(KEY_ADMIN, isAdmin);
  }, [isAdmin, hydrated]);

  useEffect(() => {
    if (hydrated) save(KEY_FEEDBACKS, feedbacks);
  }, [feedbacks, hydrated]);

  useEffect(() => {
    if (hydrated) save(KEY_EXPENSES, expenses);
  }, [expenses, hydrated]);

  useEffect(() => {
    if (hydrated) save(KEY_SALES_TARGET, salesTarget);
  }, [salesTarget, hydrated]);

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
    feedbacks,
    expenses,
    salesTarget,
    cartTotal,
    cartCount,

    addProduct: async (p) => {
      if (typeof window === "undefined") return;
      try {
        const { error } = await writeProductWithFallback("insert", {
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          price: p.price,
          stock: p.stock,
          orderBalance: p.orderBalance,
          partner: p.partner,
          promotion: p.promotion,
        });

        const optimisticProduct: Product = {
          id: uid(),
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          price: p.price,
          stock: p.stock,
          orderBalance: p.orderBalance,
          partner: p.partner,
          promotion: p.promotion,
          offerLabel: p.offerLabel,
          highlightDescription: p.highlightDescription,
          featured: p.featured,
        };

        setProducts((prev) => [optimisticProduct, ...prev]);

        if (error) {
          console.error("Error adding product:", error);
          return;
        }
      } catch (err) {
        console.error("Error adding product:", err);
      }
    },

    updateProduct: async (id, patch) => {
      if (typeof window === "undefined") return;
      try {
        const { error } = await writeProductWithFallback(
          "update",
          {
            ...(patch.name !== undefined && { name: patch.name }),
            ...(patch.description !== undefined && { description: patch.description }),
            ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl }),
            ...(patch.price !== undefined && { price: patch.price }),
            ...(patch.stock !== undefined && { stock: patch.stock }),
            ...(patch.orderBalance !== undefined && { orderBalance: patch.orderBalance }),
            ...(patch.partner !== undefined && { partner: patch.partner }),
            ...(patch.promotion !== undefined && { promotion: patch.promotion }),
          },
          id,
        );

        setProducts((prev) => prev.map((product) => (product.id === id ? { ...product, ...patch } : product)));

        if (error) {
          console.error("Error updating product:", error);
          return;
        }
      } catch (err) {
        console.error("Error updating product:", err);
      }
    },

    deleteProduct: async (id) => {
      if (typeof window === "undefined") return;
      try {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id);
        
        if (error) {
          console.error("Error deleting product:", error);
          return;
        }
        
        // Reload products from Supabase
        await loadProducts();
      } catch (err) {
        console.error("Error deleting product:", err);
      }
    },

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
            partner: product.partner,
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

    createOrder: async ({ customerName, whatsapp, notes }) => {
      if (typeof window === "undefined") return undefined;
      
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

      try {
        // Save order to Supabase
        const { error: orderError } = await supabase
          .from("orders")
          .insert([
            {
              id: order.id,
              customername: order.customerName,
              whatsapp: order.whatsapp,
              notes: order.notes,
              items: order.items,
              total: order.total,
              status: order.status,
              createdat: order.createdAt,
            },
          ]);
        
        if (orderError) {
          console.error("Error saving order:", orderError);
          return undefined;
        }

        // Update products in Supabase
        for (const p of products) {
          const inCart = cart.filter((c) => c.productId === p.id);
          const stockUsed = inCart.filter((c) => c.kind !== "order").reduce((sum, c) => sum + c.quantity, 0);
          const orderUsed = inCart.filter((c) => c.kind === "order").reduce((sum, c) => sum + c.quantity, 0);
          
          if (stockUsed > 0 || orderUsed > 0) {
            await writeProductWithFallback(
              "update",
              {
                stock: Math.max(0, p.stock - stockUsed),
                orderBalance: Math.max(0, (p.orderBalance ?? 0) - orderUsed),
              },
              p.id,
            );
          }
        }

        // Update local state
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
      } catch (err) {
        console.error("Error creating order:", err);
        return undefined;
      }
    },

      updateOrderStatus: async (id, status, scheduledAt) => {
      if (typeof window === "undefined") return;
      try {
        const { error } = await supabase
          .from("orders")
          .update({ status, scheduledat: scheduledAt })
          .eq("id", id);
        
        if (error) {
          console.error("Error updating order status:", error);
          return;
        }
        
        // Update local state
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status, scheduledAt } : o)),
        );
      } catch (err) {
        console.error("Error updating order status:", err);
      }
    },

    submitOrderFeedback: async (id, feedback) => {
      if (typeof window === "undefined") return;
      try {
        const { error } = await supabase
          .from("orders")
          .update({ feedback })
          .eq("id", id);

        if (error) {
          console.error("Error submitting order feedback:", error);
          return;
        }

        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, feedback } : o)),
        );
      } catch (err) {
        console.error("Error submitting order feedback:", err);
      }
    },

    submitProductFeedback: async (productId, name, comment) => {
      const entry: ProductFeedback = {
        id: uid(),
        productId,
        name: name.trim(),
        comment: comment.trim(),
        approved: false,
        isBot: false,
        createdAt: new Date().toISOString(),
      };
      setFeedbacks((prev) => [entry, ...prev]);
    },

    approveFeedback: async (id, approved) => {
      setFeedbacks((prev) => prev.map((item) => (item.id === id ? { ...item, approved } : item)));
    },

    addExpense: async (expense) => {
      const entry: ExpenseEntry = {
        id: uid(),
        description: expense.description.trim(),
        amount: Number(expense.amount) || 0,
        category: expense.category,
        paidAt: expense.paidAt,
        expectedReturnAt: expense.expectedReturnAt,
        expectedProfit: expense.expectedProfit,
        notes: expense.notes,
      };
      setExpenses((prev) => [entry, ...prev]);
    },

    deleteExpense: async (id) => {
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    },

    setSalesTarget: (value) => setSalesTarget(value),

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
