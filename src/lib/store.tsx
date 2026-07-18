import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem, ExpenseEntry, Order, OrderStatus, Product, ProductFeedback, RevenueEntry } from "./types";
import { uid } from "./format";
import { sendOrderToTelegram } from "./telegram";

const KEY_CART = "sdp:cart";
const KEY_FEEDBACKS = "sdp:feedbacks";
const KEY_EXPENSES = "sdp:expenses";
const KEY_REVENUES = "sdp:revenues";
const KEY_SALES_TARGET = "sdp:salesTarget";
const KEY_HOME_VIDEO = "sdp:homeVideoUrl";
const KEY_HOME_IMAGE = "sdp:homeImageUrl";

const DEFAULT_FEEDBACKS: ProductFeedback[] = [];
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "fallback-coxinha",
    name: "Coxinha artesanal",
    description: "Coxinha crocante com recheio cremoso de frango.",
    imageUrl: "https://placehold.co/800x600/png?text=Coxinha",
    price: 7.5,
    stock: 12,
    orderBalance: 0,
    partner: false,
    promotion: true,
    mediaType: "image",
  },
  {
    id: "fallback-esfiha",
    name: "Esfiha de carne",
    description: "Esfiha macia recheada com carne temperada.",
    imageUrl: "https://placehold.co/800x600/png?text=Esfiha",
    price: 8.5,
    stock: 10,
    orderBalance: 0,
    partner: false,
    promotion: false,
    mediaType: "image",
  },
  {
    id: "fallback-pastel",
    name: "Pastel de queijo",
    description: "Pastel fritinho com queijo e cebola por cima.",
    imageUrl: "https://placehold.co/800x600/png?text=Pastel",
    price: 9,
    stock: 8,
    orderBalance: 0,
    partner: false,
    promotion: true,
    mediaType: "image",
  },
];

// Generate a simple, customer-friendly order code (e.g., "ABC123")
function generateOrderCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sanitizeFeedbacks(value: unknown): ProductFeedback[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<ProductFeedback>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const comment = typeof item.comment === "string" ? item.comment.trim() : "";
    const id = typeof item.id === "string" ? item.id : uid();
    const productId = typeof item.productId === "string" ? item.productId : "";

    if (!name || !comment) return [];
    return [{
      id,
      productId,
      name,
      comment,
      approved: Boolean(item.approved),
      isBot: Boolean(item.isBot),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    }];
  }).filter((item) => !item.isBot);
}

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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined;
  return (await response.json()) as T;
}

type Ctx = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  isAdmin: boolean;
  feedbacks: ProductFeedback[];
  expenses: ExpenseEntry[];
  revenues: RevenueEntry[];
  salesTarget: number;
  homeVideoUrl: string;
  homeImageUrl: string;

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
  updateOrderStatus: (id: string, status: OrderStatus, scheduledAt?: string, adminMessage?: string) => Promise<void>;
  refreshOrderStatus: (id: string) => Promise<void>;
  submitOrderFeedback: (id: string, feedback: string) => Promise<void>;

  // admin
  loginAdmin: (password: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  submitProductFeedback: (productId: string, name: string, comment: string) => Promise<void>;
  approveFeedback: (id: string, approved: boolean) => Promise<void>;
  addExpense: (expense: Omit<ExpenseEntry, "id">) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addRevenue: (revenue: Omit<RevenueEntry, "id">) => Promise<void>;
  deleteRevenue: (id: string) => Promise<void>;
  setSalesTarget: (value: number) => void;
  setHomeVideoUrl: (value: string) => void;
  setHomeImageUrl: (value: string) => void;
};

const StoreContext = createContext<Ctx | null>(null);

function normalizeProduct(row: Record<string, unknown>): Product {
  const mediaTypeRaw = String(
    (row.mediaType as string | undefined) ??
      (row.mediatype as string | undefined) ??
      (row.media_type as string | undefined) ??
      "image",
  ).toLowerCase();

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
    partnerUrl: String(
      (row.partnerUrl as string | undefined) ??
        (row.partnerurl as string | undefined) ??
        (row.partner_url as string | undefined) ??
        "",
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
    mediaUrl: String(
      (row.mediaUrl as string | undefined) ??
        (row.mediarurl as string | undefined) ??
        (row.media_url as string | undefined) ??
        "",
    ),
    mediaType: mediaTypeRaw === "video" ? "video" : "image",
  };
}

function normalizeOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id ?? ""),
    orderCode: String(row.ordercode ?? row.orderCode ?? ""),
    customerName: String(row.customername ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    notes: String(row.notes ?? ""),
    items: Array.isArray(row.items) ? (row.items as CartItem[]) : [],
    total: Number(row.total ?? 0),
    status: (row.status as OrderStatus | undefined) ?? "recebido",
    createdAt: String((row.createdat as string | undefined) ?? (row.createdAt as string | undefined) ?? ""),
    scheduledAt: (row.scheduledat as string | undefined) ?? (row.scheduledAt as string | undefined) ?? undefined,
    feedback: typeof row.feedback === "string" ? row.feedback : undefined,
    adminMessage: typeof row.adminmessage === "string" ? row.adminmessage : typeof row.adminMessage === "string" ? row.adminMessage : undefined,
  };
}

function buildProductPayload(
  values: Partial<Product> & { name?: string; description?: string; imageUrl?: string | null; price?: number; stock?: number; orderBalance?: number | null; partner?: boolean; partnerUrl?: string; promotion?: boolean; offerLabel?: string; highlightDescription?: string; featured?: boolean; mediaUrl?: string | null; mediaType?: "image" | "video" },
  variant: "camel" | "lower" | "snake",
) {
  const imageKey = variant === "camel" ? "imageUrl" : variant === "lower" ? "imageurl" : "image_url";
  const orderBalanceKey = variant === "camel" ? "orderBalance" : variant === "lower" ? "orderbalance" : "order_balance";
  const mediaUrlKey = variant === "camel" ? "mediaUrl" : variant === "lower" ? "mediaurl" : "media_url";
  const mediaTypeKey = variant === "camel" ? "mediaType" : variant === "lower" ? "mediatype" : "media_type";
  const partnerKey = "partner";
  const partnerUrlKey = variant === "camel" ? "partnerUrl" : variant === "lower" ? "partnerurl" : "partner_url";
  const promotionKey = "promotion";

  return {
    ...(values.name !== undefined && { name: values.name }),
    ...(values.description !== undefined && { description: values.description }),
    ...(values.imageUrl !== undefined && { [imageKey]: values.imageUrl }),
    ...(values.price !== undefined && { price: values.price }),
    ...(values.stock !== undefined && { stock: values.stock }),
    ...(values.orderBalance !== undefined && { [orderBalanceKey]: values.orderBalance }),
    ...(values.partner !== undefined && { [partnerKey]: values.partner }),
    ...(values.partnerUrl !== undefined && { [partnerUrlKey]: values.partnerUrl }),
    ...(values.promotion !== undefined && { [promotionKey]: values.promotion }),
    ...(values.mediaUrl !== undefined && { [mediaUrlKey]: values.mediaUrl }),
    ...(values.mediaType !== undefined && { [mediaTypeKey]: values.mediaType }),
  };
}

async function saveProductWithApi(
  operation: "insert" | "update",
  values: Partial<Product> & { name?: string; description?: string; imageUrl?: string | null; price?: number; stock?: number; orderBalance?: number | null; partner?: boolean; partnerUrl?: string; promotion?: boolean; offerLabel?: string; highlightDescription?: string; featured?: boolean; mediaUrl?: string | null; mediaType?: "image" | "video" },
  id?: string,
) {
  const payload = buildProductPayload(values, "camel");
  const path = operation === "insert" ? "/api/products" : `/api/products/${id ?? ""}`;
  const response = await fetch(path, {
    method: operation === "insert" ? "POST" : "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product: payload }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Failed to save product: ${response.status}`);
  }

  return response.json();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedbacks, setFeedbacks] = useState<ProductFeedback[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [revenues, setRevenues] = useState<RevenueEntry[]>([]);
  const [salesTarget, setSalesTarget] = useState(5000);
  const [homeVideoUrl, setHomeVideoUrl] = useState("");
  const [homeImageUrl, setHomeImageUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Load cart and admin from localStorage
  const loadRevenueEntriesFromServer = async () => {
    if (typeof window === "undefined") return;
    try {
      const data = await requestJson<Array<Record<string, unknown>>>('/api/revenue-entries');
      setRevenues((data || []).map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ""),
        description: String(row.description ?? ""),
        amount: Number(row.amount ?? 0),
        category: String(row.category ?? ""),
        receivedAt: String((row.received_at as string | undefined) ?? (row.receivedAt as string | undefined) ?? ""),
        status: (row.status as RevenueEntry["status"] | undefined) ?? "recebida",
        notes: typeof row.notes === "string" ? row.notes : "",
      })));
    } catch (err) {
      console.error("Error loading revenue entries:", err);
    }
  };

  useEffect(() => {
    const localVideoUrl = load<string>(KEY_HOME_VIDEO, "");
    const localImageUrl = load<string>(KEY_HOME_IMAGE, "");
    setCart(load<CartItem[]>(KEY_CART, []));
    setIsAdmin(false);
    setFeedbacks(sanitizeFeedbacks(load<unknown>(KEY_FEEDBACKS, DEFAULT_FEEDBACKS)));
    setExpenses(load<ExpenseEntry[]>(KEY_EXPENSES, []));
    setRevenues(load<RevenueEntry[]>(KEY_REVENUES, []));
    setSalesTarget(load<number>(KEY_SALES_TARGET, 5000));
    setHomeVideoUrl(localVideoUrl);
    setHomeImageUrl(localImageUrl);
    setHydrated(true);

    if (typeof window !== "undefined") {
      void loadRevenueEntriesFromServer();
      void requestJson<Array<{ key: string; value?: string | null }>>('/api/site-settings?keys=homeVideoUrl,homeImageUrl')
        .then((entries) => {
          const nextVideoUrl = (entries || []).find((entry) => entry.key === "homeVideoUrl")?.value?.trim() ?? "";
          const nextImageUrl = (entries || []).find((entry) => entry.key === "homeImageUrl")?.value?.trim() ?? "";
          if (nextVideoUrl) {
            setHomeVideoUrl(nextVideoUrl);
            save(KEY_HOME_VIDEO, nextVideoUrl);
          }
          if (nextImageUrl) {
            setHomeImageUrl(nextImageUrl);
            save(KEY_HOME_IMAGE, nextImageUrl);
          }
        })
        .catch((err) => console.error("Error loading site settings:", err));
    }
  }, []);

  // Load products from Supabase
  const loadProducts = async () => {
    if (typeof window === "undefined") return;
    try {
      const data = await requestJson<Array<Record<string, unknown>>>('/api/products');
      const nextProducts = (data || []).map(normalizeProduct);
      setProducts(nextProducts.length > 0 ? nextProducts : FALLBACK_PRODUCTS);
    } catch (err) {
      console.error("Error loading products:", err);
      setProducts(FALLBACK_PRODUCTS);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  // Load orders from Supabase
  const loadOrders = async () => {
    if (typeof window === "undefined") return;
    try {
      const data = await requestJson<Array<Record<string, unknown>>>('/api/orders');
      setOrders((data || []).map((order) => normalizeOrder(order as Record<string, unknown>)));
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

  useEffect(() => {
    if (hydrated) save(KEY_FEEDBACKS, feedbacks);
  }, [feedbacks, hydrated]);

  useEffect(() => {
    if (hydrated) save(KEY_EXPENSES, expenses);
  }, [expenses, hydrated]);

  useEffect(() => {
    if (hydrated) save(KEY_REVENUES, revenues);
  }, [revenues, hydrated]);

  useEffect(() => {
    if (hydrated) save(KEY_SALES_TARGET, salesTarget);
  }, [salesTarget, hydrated]);

  useEffect(() => {
    if (hydrated) save(KEY_HOME_VIDEO, homeVideoUrl);
  }, [homeVideoUrl, hydrated]);

  useEffect(() => {
    if (hydrated) save(KEY_HOME_IMAGE, homeImageUrl);
  }, [homeImageUrl, hydrated]);

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
    revenues,
    salesTarget,
    homeVideoUrl,
    homeImageUrl,
    cartTotal,
    cartCount,

    addProduct: async (p) => {
      if (typeof window === "undefined") return;
      try {
        const { error } = await saveProductWithApi("insert", {
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          price: p.price,
          stock: p.stock,
          orderBalance: p.orderBalance,
          partner: p.partner,
          partnerUrl: p.partnerUrl,
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
          partnerUrl: p.partnerUrl,
          promotion: p.promotion,
          offerLabel: p.offerLabel,
          highlightDescription: p.highlightDescription,
          featured: p.featured,
          mediaUrl: p.mediaUrl,
          mediaType: p.mediaType,
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
        const { error } = await saveProductWithApi(
          "update",
          {
            ...(patch.name !== undefined && { name: patch.name }),
            ...(patch.description !== undefined && { description: patch.description }),
            ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl }),
            ...(patch.price !== undefined && { price: patch.price }),
            ...(patch.stock !== undefined && { stock: patch.stock }),
            ...(patch.orderBalance !== undefined && { orderBalance: patch.orderBalance }),
            ...(patch.partner !== undefined && { partner: patch.partner }),
            ...(patch.partnerUrl !== undefined && { partnerUrl: patch.partnerUrl }),
            ...(patch.promotion !== undefined && { promotion: patch.promotion }),
            ...(patch.mediaUrl !== undefined && { mediaUrl: patch.mediaUrl }),
            ...(patch.mediaType !== undefined && { mediaType: patch.mediaType }),
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
        const response = await fetch(`/api/products/${id}`, {
          method: "DELETE",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          const body = await response.text();
          console.error("Error deleting product:", body);
          return;
        }

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
      
      const orderCode = generateOrderCode();
      const order: Order = {
        id: uid(),
        orderCode,
        customerName,
        whatsapp,
        notes,
        items: cart,
        total: cartTotal,
        status: "recebido",
        createdAt: new Date().toISOString(),
      };

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: order.id,
            orderCode: order.orderCode,
            customerName: order.customerName,
            whatsapp: order.whatsapp,
            notes: order.notes,
            items: order.items,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          console.error("Error saving order:", body);
          return undefined;
        }

        const payload = (await response.json()) as { order?: Order };

        // Update local state
        setOrders((prev) => [payload.order ?? order, ...prev]);
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

        void sendOrderToTelegram(payload.order ?? order);
        return payload.order ?? order;
      } catch (err) {
        console.error("Error creating order:", err);
        return undefined;
      }
    },

      updateOrderStatus: async (id, status, scheduledAt, adminMessage) => {
      if (typeof window === "undefined") return;
      try {
        const response = await fetch(`/api/orders/${id}`, {
          method: "PATCH",
          credentials: "include",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status, scheduledAt, adminMessage }),
        });

        if (!response.ok) {
          const body = await response.text();
          console.error("Error updating order status:", body);
          return;
        }

        const payload = (await response.json()) as { order?: Order };
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, ...(payload.order ?? { status, scheduledAt, adminMessage }) } : o)),
        );
      } catch (err) {
        console.error("Error updating order status:", err);
      }
    },

    refreshOrderStatus: async (id) => {
      if (typeof window === "undefined") return;
      try {
        const data = await requestJson<Record<string, unknown>>(`/api/orders/${id}`);
        if (!data) return;

        const refreshedOrder = normalizeOrder(data);
        setOrders((prev) => {
          const exists = prev.some((order) => order.id === refreshedOrder.id);
          return exists
            ? prev.map((order) => (order.id === refreshedOrder.id ? refreshedOrder : order))
            : [refreshedOrder, ...prev];
        });
      } catch (err) {
        console.error("Error refreshing order status:", err);
      }
    },

    submitOrderFeedback: async (id, feedback) => {
      if (typeof window === "undefined") return;
      try {
        const response = await fetch(`/api/orders/${id}`, {
          method: "PATCH",
          credentials: "include",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ feedback }),
        });

        if (!response.ok) {
          const body = await response.text();
          console.error("Error submitting order feedback:", body);
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
        category: expense.category.trim(),
        paidAt: expense.paidAt,
        expectedReturnAt: expense.expectedReturnAt,
        expectedProfit: expense.expectedProfit,
        notes: expense.notes,
        quantity: Math.max(1, Number(expense.quantity) || 1),
        status: expense.status ?? "pendente",
      };
      setExpenses((prev) => [entry, ...prev]);
    },

    deleteExpense: async (id) => {
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    },

    addRevenue: async (revenue) => {
      const entry: RevenueEntry = {
        id: uid(),
        description: revenue.description.trim(),
        amount: Number(revenue.amount) || 0,
        category: revenue.category.trim(),
        receivedAt: revenue.receivedAt,
        status: revenue.status ?? "recebida",
        notes: revenue.notes,
      };
      setRevenues((prev) => [entry, ...prev]);

      if (typeof window === "undefined") return;
      try {
        const response = await fetch('/api/revenue-entries', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: entry.id,
            description: entry.description,
            amount: entry.amount,
            category: entry.category,
            receivedAt: entry.receivedAt,
            status: entry.status ?? 'recebida',
            notes: entry.notes ?? '',
          }),
        });
        if (!response.ok) {
          const body = await response.text();
          console.error("Error saving revenue entry:", body);
        }
      } catch (err) {
        console.error("Error saving revenue entry:", err);
      }
    },

    deleteRevenue: async (id) => {
      if (typeof window === "undefined") return;
      try {
        const response = await fetch(`/api/revenue-entries/${id}`, {
          method: 'DELETE',
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) {
          const body = await response.text();
          console.error("Error deleting revenue entry:", body);
        }
      } catch (err) {
        console.error("Error deleting revenue entry:", err);
      }
      setRevenues((prev) => prev.filter((item) => item.id !== id));
    },

    setSalesTarget: (value) => setSalesTarget(value),
    setHomeVideoUrl: (value) => {
      const next = value.trim();
      setHomeVideoUrl(next);
      save(KEY_HOME_VIDEO, next);
      void fetch('/api/site-settings', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: 'homeVideoUrl', value: next }),
      }).catch((err) => console.error("Error saving home video URL:", err));
    },
    setHomeImageUrl: (value) => {
      const next = value.trim();
      setHomeImageUrl(next);
      save(KEY_HOME_IMAGE, next);
      void fetch('/api/site-settings', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: 'homeImageUrl', value: next }),
      }).catch((err) => console.error("Error saving home image URL:", err));
    },

    loginAdmin: async (password) => {
      if (typeof window === "undefined") return false;

      try {
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ password }),
        });
        const ok = response.ok;
        setIsAdmin(ok);
        return ok;
      } catch {
        setIsAdmin(false);
        return false;
      }
    },
    logoutAdmin: async () => {
      if (typeof window !== "undefined") {
        try {
          await fetch("/api/admin/logout", { method: "POST", credentials: "include", cache: "no-store" });
        } catch {
          // ignore logout errors and still clear local state
        }
      }
      setIsAdmin(false);
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
