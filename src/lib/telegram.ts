import type { Order } from "./types";
import { brl, formatDateTime } from "./format";

/**
 * Telegram bot notification.
 *
 * Para ativar, defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.
 * Enquanto vazios, a função apenas registra no console (modo dev).
 * Estruturado para migrar facilmente para um server function/edge no futuro.
 */
const TELEGRAM_BOT_TOKEN = ""; // TODO: preencher
const TELEGRAM_CHAT_ID = ""; // TODO: preencher

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
