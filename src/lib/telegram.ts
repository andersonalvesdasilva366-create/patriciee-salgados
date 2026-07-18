import type { Order } from "./types";
import { brl, formatDateTime } from "./format";

/**
 * Telegram bot notification.
 *
 * O envio agora é tratado no servidor, sem expor segredos no frontend.
 */
const TELEGRAM_BOT_TOKEN = "";
const TELEGRAM_CHAT_ID = "";

export function buildOrderMessage(order: Order): string {
  const products = order.items
    .map((i) => `• ${i.name} x${i.quantity}`)
    .join("\n");

  return [
    "🛒 *NOVO PEDIDO*",
    "",
    "👤 *Cliente:*",
    order.customerName,
    "",
    "📱 *Whatsapp:*",
    order.whatsapp,
    "",
    "🍽 *Produtos:*",
    products,
    "",
    "📝 *Observações:*",
    order.notes?.trim() || "—",
    "",
    "💰 *Total:*",
    brl(order.total),
    "",
    "🕒 *Horário:*",
    formatDateTime(order.createdAt),
    "",
    "_Salgados da Paty_",
  ].join("\n");
}

export async function sendOrderToTelegram(order: Order): Promise<void> {
  const text = buildOrderMessage(order);

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.info("[Telegram] (desativado — configure token e chat id)\n" + text);
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("[Telegram] falha ao enviar mensagem", err);
  }
}
