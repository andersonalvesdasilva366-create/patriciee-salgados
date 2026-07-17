import "./lib/error-capture";

import { createHmac, timingSafeEqual } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const ADMIN_COOKIE_NAME = "sdp_admin_session";
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV !== "production" ? "dev-admin-password" : "")).trim();
const ADMIN_SESSION_SECRET = (process.env.ADMIN_SESSION_SECRET ?? ADMIN_PASSWORD ?? "").trim();
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8;

let serverEntryPromise: Promise<ServerEntry> | undefined;

const supabaseUrl = process.env.SUPABASE_URL ?? "https://swzfjksxrsupkekwpyor.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_ANON_KEY ?? "";
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const entry = cookies.find((item) => item.startsWith(`${name}=`));
  if (!entry) return null;
  return decodeURIComponent(entry.slice(name.length + 1));
}

function createSessionToken(password: string) {
  const issuedAt = Date.now().toString();
  const signingKey = ADMIN_SESSION_SECRET || ADMIN_PASSWORD || "dev-admin-session-secret";
  const signature = createHmac("sha256", signingKey)
    .update(`${issuedAt}:${password}`)
    .digest("hex");
  return `${issuedAt}.${signature}`;
}

function verifySessionToken(token: string) {
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;
  const issuedTime = Number(issuedAt);
  if (Number.isNaN(issuedTime)) return false;
  if (Date.now() - issuedTime > ADMIN_SESSION_TTL_MS) return false;

  const signingKey = ADMIN_SESSION_SECRET || ADMIN_PASSWORD || "dev-admin-session-secret";
  const expectedSignature = createHmac("sha256", signingKey)
    .update(`${issuedAt}:${ADMIN_PASSWORD}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function hasValidAdminSession(request: Request) {
  const token = getCookieValue(request, ADMIN_COOKIE_NAME);
  return Boolean(token && verifySessionToken(token));
}

function buildCookieHeader(value: string | null, maxAgeSeconds?: number) {
  const secure = typeof window === "undefined" && process.env.NODE_ENV === "production" ? "; Secure" : "";
  const base = `${ADMIN_COOKIE_NAME}=${value ?? ""}; Path=/; HttpOnly; SameSite=Lax${secure}`;
  if (value === null) return `${base}; Max-Age=0`;
  if (maxAgeSeconds) return `${base}; Max-Age=${maxAgeSeconds}`;
  return base;
}

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getPathSegments(url: URL) {
  return url.pathname.split("/").filter(Boolean);
}

function buildProductPayload(values: Record<string, unknown>, variant: "camel" | "lower" | "snake") {
  const imageKey = variant === "camel" ? "imageUrl" : variant === "lower" ? "imageurl" : "image_url";
  const orderBalanceKey = variant === "camel" ? "orderBalance" : variant === "lower" ? "orderbalance" : "order_balance";
  const mediaUrlKey = variant === "camel" ? "mediaUrl" : variant === "lower" ? "mediaurl" : "media_url";
  const mediaTypeKey = variant === "camel" ? "mediaType" : variant === "lower" ? "mediatype" : "media_type";
  const partnerUrlKey = variant === "camel" ? "partnerUrl" : variant === "lower" ? "partnerurl" : "partner_url";

  return {
    ...(values.name !== undefined && { name: values.name }),
    ...(values.description !== undefined && { description: values.description }),
    ...(values.imageUrl !== undefined && { [imageKey]: values.imageUrl }),
    ...(values.price !== undefined && { price: values.price }),
    ...(values.stock !== undefined && { stock: values.stock }),
    ...(values.orderBalance !== undefined && { [orderBalanceKey]: values.orderBalance }),
    ...(values.partner !== undefined && { partner: values.partner }),
    ...(values.partnerUrl !== undefined && { [partnerUrlKey]: values.partnerUrl }),
    ...(values.promotion !== undefined && { promotion: values.promotion }),
    ...(values.mediaUrl !== undefined && { [mediaUrlKey]: values.mediaUrl }),
    ...(values.mediaType !== undefined && { [mediaTypeKey]: values.mediaType }),
    ...(values.offerLabel !== undefined && { offerLabel: values.offerLabel }),
    ...(values.highlightDescription !== undefined && { highlightDescription: values.highlightDescription }),
    ...(values.featured !== undefined && { featured: values.featured }),
  };
}

async function writeProductWithFallback(operation: "insert" | "update", values: Record<string, unknown>, id?: string) {
  if (!supabaseAdmin) {
    return { error: new Error("Supabase admin client is not configured") };
  }

  const payloads = [
    buildProductPayload(values, "lower"),
    buildProductPayload(values, "camel"),
    buildProductPayload(values, "snake"),
  ];

  let lastError: unknown;
  for (const payload of payloads) {
    const query = operation === "insert"
      ? supabaseAdmin.from("products").insert([payload]).select().single()
      : supabaseAdmin.from("products").update(payload).eq("id", id ?? "").select().single();

    const { data, error } = await query;
    if (!error) return { data, error: null };
    lastError = error;
    const message = typeof error.message === "string" ? error.message : "";
    if (!/column/i.test(message)) break;
  }

  return { data: null, error: lastError };
}

async function handleAdminLogin(request: Request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, message: "Método não permitido" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let payload: { password?: string } | null = null;
  try {
    payload = (await request.json()) as { password?: string } | null;
  } catch {
    payload = null;
  }

  const password = typeof payload?.password === "string" ? payload.password : "";
  if (!ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: false, message: "Admin não configurado" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  if (password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: false, message: "Senha incorreta" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const token = createSessionToken(password);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": buildCookieHeader(token, Math.floor(ADMIN_SESSION_TTL_MS / 1000)),
    },
  });
}

async function handleAdminLogout() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": buildCookieHeader(null),
    },
  });
}

async function handleAdminMe(request: Request) {
  if (hasValidAdminSession(request)) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: false }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

async function handleProducts(request: Request, url: URL) {
  const segments = getPathSegments(url);
  const productId = segments[2];

  if (!supabaseAdmin) {
    return jsonResponse({ ok: false, error: "Supabase admin client is not configured" }, { status: 500 });
  }

  if (request.method === "GET") {
    const { data, error } = await supabaseAdmin.from("products").select("*").order("created_at", { ascending: false });
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse(data ?? []);
  }

  if (!hasValidAdminSession(request)) {
    return jsonResponse({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  if (request.method === "POST") {
    const body = await readJsonBody(request);
    const values = (body?.product as Record<string, unknown> | undefined) ?? body ?? {};
    const { data, error } = await writeProductWithFallback("insert", values);
    if (error) return jsonResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    return jsonResponse({ ok: true, product: data });
  }

  if (request.method === "PATCH" && productId) {
    const body = await readJsonBody(request);
    const values = (body?.product as Record<string, unknown> | undefined) ?? body ?? {};
    const { data, error } = await writeProductWithFallback("update", values, productId);
    if (error) return jsonResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    return jsonResponse({ ok: true, product: data });
  }

  if (request.method === "DELETE" && productId) {
    const { error } = await supabaseAdmin.from("products").delete().eq("id", productId);
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Método não permitido" }, { status: 405 });
}

async function handleOrders(request: Request, url: URL) {
  const segments = getPathSegments(url);
  const orderId = segments[2];

  if (!supabaseAdmin) {
    return jsonResponse({ ok: false, error: "Supabase admin client is not configured" }, { status: 500 });
  }

  if (request.method === "GET") {
    if (orderId) {
      const { data, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
      return jsonResponse(data ?? null);
    }

    if (!hasValidAdminSession(request)) {
      return jsonResponse({ ok: false, error: "Não autorizado" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.from("orders").select("*").order("createdat", { ascending: false });
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse(data ?? []);
  }

  if (request.method === "POST") {
    const body = await readJsonBody(request);
    const payload = {
      id: body?.id ?? undefined,
      ordercode: body?.orderCode ?? body?.ordercode,
      customername: body?.customerName ?? body?.customername,
      whatsapp: body?.whatsapp,
      notes: body?.notes ?? "",
      items: body?.items ?? [],
      total: body?.total ?? 0,
      status: body?.status ?? "recebido",
      createdat: body?.createdAt ?? new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from("orders").insert([payload]).select().single();
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });

    const items = Array.isArray(body?.items) ? body.items : [];
    for (const item of items as Array<Record<string, unknown>>) {
      const productId = String(item.productId ?? item.id ?? "");
      const quantity = Number(item.quantity ?? 0);
      const kind = String(item.kind ?? "stock");
      if (!productId || !quantity) continue;

      const { data: productRow, error: productError } = await supabaseAdmin.from("products").select("*").eq("id", productId).maybeSingle();
      if (productError || !productRow) continue;

      const stockUsed = kind !== "order" ? quantity : 0;
      const orderUsed = kind === "order" ? quantity : 0;
      const currentStock = Number((productRow.stock as number | undefined) ?? 0);
      const currentOrderBalance = Number((productRow.orderBalance as number | undefined) ?? (productRow.orderbalance as number | undefined) ?? (productRow.order_balance as number | undefined) ?? 0);
      await writeProductWithFallback("update", {
        stock: Math.max(0, currentStock - stockUsed),
        orderBalance: Math.max(0, currentOrderBalance - orderUsed),
      }, productId);
    }

    return jsonResponse({ ok: true, order: data });
  }

  if (request.method === "PATCH" && orderId) {
    const body = await readJsonBody(request);
    const isAdminUpdate = hasValidAdminSession(request);
    const updatePayload: Record<string, unknown> = {};

    if (body?.status !== undefined) updatePayload.status = body.status;
    if (body?.scheduledAt !== undefined) updatePayload.scheduledat = body.scheduledAt;
    if (body?.adminMessage !== undefined) updatePayload.adminmessage = body.adminMessage;
    if (body?.feedback !== undefined) updatePayload.feedback = body.feedback;

    if (!isAdminUpdate && Object.keys(updatePayload).some((key) => key !== "feedback")) {
      return jsonResponse({ ok: false, error: "Não autorizado" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.from("orders").update(updatePayload).eq("id", orderId).select().single();
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse({ ok: true, order: data });
  }

  return jsonResponse({ ok: false, error: "Método não permitido" }, { status: 405 });
}

async function handleRevenueEntries(request: Request, url: URL) {
  const segments = getPathSegments(url);
  const revenueId = segments[2];

  if (!supabaseAdmin) {
    return jsonResponse({ ok: false, error: "Supabase admin client is not configured" }, { status: 500 });
  }

  if (!hasValidAdminSession(request)) {
    return jsonResponse({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  if (request.method === "GET") {
    const { data, error } = await supabaseAdmin.from("revenue_entries").select("*").order("received_at", { ascending: false });
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse(data ?? []);
  }

  if (request.method === "POST") {
    const body = await readJsonBody(request);
    const payload = {
      id: body?.id ?? undefined,
      description: body?.description ?? "",
      amount: body?.amount ?? 0,
      category: body?.category ?? "",
      received_at: body?.receivedAt ?? null,
      status: body?.status ?? "recebida",
      notes: body?.notes ?? "",
    };
    const { data, error } = await supabaseAdmin.from("revenue_entries").insert([payload]).select().single();
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse({ ok: true, revenueEntry: data });
  }

  if (request.method === "DELETE" && revenueId) {
    const { error } = await supabaseAdmin.from("revenue_entries").delete().eq("id", revenueId);
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Método não permitido" }, { status: 405 });
}

async function handleSiteSettings(request: Request, url: URL) {
  const segments = getPathSegments(url);
  if (!supabaseAdmin) {
    return jsonResponse({ ok: false, error: "Supabase admin client is not configured" }, { status: 500 });
  }

  if (request.method === "GET") {
    const requestedKeys = url.searchParams.get("keys")?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
    let query = supabaseAdmin.from("site_settings").select("key, value");
    if (requestedKeys.length) query = query.in("key", requestedKeys);
    const { data, error } = await query;
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse(data ?? []);
  }

  if (!hasValidAdminSession(request)) {
    return jsonResponse({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  if (request.method === "POST") {
    const body = await readJsonBody(request);
    const { error } = await supabaseAdmin.from("site_settings").upsert({ key: body?.key, value: body?.value }, { onConflict: "key" });
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 500 });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Método não permitido" }, { status: 405 });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const segments = getPathSegments(url);

    if (url.pathname === "/api/admin/login") {
      return handleAdminLogin(request);
    }

    if (url.pathname === "/api/admin/logout") {
      return handleAdminLogout();
    }

    if (url.pathname === "/api/admin/me") {
      return handleAdminMe(request);
    }

    if (segments[0] === "api" && segments[1] === "products") {
      return handleProducts(request, url);
    }

    if (segments[0] === "api" && segments[1] === "orders") {
      return handleOrders(request, url);
    }

    if (segments[0] === "api" && segments[1] === "revenue-entries") {
      return handleRevenueEntries(request, url);
    }

    if (segments[0] === "api" && segments[1] === "site-settings") {
      return handleSiteSettings(request, url);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
