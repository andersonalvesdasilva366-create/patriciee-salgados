import "./lib/error-capture";

import { createHmac, timingSafeEqual } from "node:crypto";

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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    if (url.pathname === "/api/admin/login") {
      return handleAdminLogin(request);
    }

    if (url.pathname === "/api/admin/logout") {
      return handleAdminLogout();
    }

    if (url.pathname === "/api/admin/me") {
      return handleAdminMe(request);
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      if (!hasValidAdminSession(request)) {
        return Response.redirect(new URL("/", request.url), 302);
      }
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
