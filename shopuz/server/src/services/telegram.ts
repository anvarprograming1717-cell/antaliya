import { db } from "../db.js";
import { settingsTable, customersTable } from "../schema.js";
import { eq } from "drizzle-orm";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8359379882:AAGKJztoz5r0llpr6mBv7Z5z2BFQtN3isHM";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DEFAULT_ADMINS = [214840221, 7157868450];

async function tg(method: string, body: object): Promise<any> {
  try {
    const r = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.json();
  } catch {
    return null;
  }
}

export async function sendMessage(chatId: number | string, text: string): Promise<void> {
  try {
    await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
  } catch {}
}

async function getAdminIds(): Promise<number[]> {
  try {
    const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "telegram_admins")).limit(1);
    if (!setting || !setting.value) return DEFAULT_ADMINS;
    return setting.value.split(",").map(Number).filter(Boolean);
  } catch {
    return DEFAULT_ADMINS;
  }
}

async function setAdminIds(ids: number[]): Promise<void> {
  const value = ids.join(",");
  try {
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, "telegram_admins")).limit(1);
    if (existing.length > 0) {
      await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, "telegram_admins"));
    } else {
      await db.insert(settingsTable).values({ key: "telegram_admins", value });
    }
  } catch {}
}

export async function notifyAdmins(text: string): Promise<void> {
  const adminIds = await getAdminIds();
  await Promise.all(adminIds.map(id => sendMessage(id, text)));
}

const STATUS_MESSAGES: Record<string, string> = {
  new: "🆕 Buyurtmangiz qabul qilindi",
  confirmed: "✅ Buyurtmangiz tasdiqlandi",
  preparing: "👨‍🍳 Buyurtmangiz tayyorlanmoqda",
  delivering: "🚴 Buyurtmangiz yetkazilmoqda",
  delivered: "🎉 Buyurtmangiz yetkazildi!",
  cancelled: "❌ Buyurtmangiz bekor qilindi",
};

export async function notifyCustomerOrderStatus(customerId: number, orderId: number, status: string): Promise<void> {
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
    if (!customer?.telegramId) return;
    const msg = STATUS_MESSAGES[status];
    if (!msg) return;
    await sendMessage(customer.telegramId, `${msg}\n\n📦 Buyurtma #${orderId}`);
  } catch {}
}

let lastUpdateId = 0;
let polling = false;

async function processUpdate(update: any): Promise<void> {
  if (!update.message) return;
  const { chat, text, from } = update.message;
  const chatId: number = chat.id;

  if (text === "/start" || text?.startsWith("/start ")) {
    await sendMessage(chatId,
      `🛍️ <b>ShopUz Bot</b>\n\n` +
      `Salom! Sizning Telegram ID: <code>${chatId}</code>\n\n` +
      `Buyurtmalaringiz haqida xabar olish uchun:\n` +
      `/link <telefon_raqam>\n` +
      `Misol: <code>/link +998901234567</code>`
    );
    return;
  }

  if (text?.startsWith("/link ")) {
    const phone = text.substring(6).trim();
    if (!phone) { await sendMessage(chatId, "❌ Format: /link +998901234567"); return; }
    try {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
      if (!customer) { await sendMessage(chatId, "❌ Bu telefon raqam topilmadi. Avval saytda ro'yxatdan o'ting."); return; }
      await db.update(customersTable).set({ telegramId: String(chatId) }).where(eq(customersTable.id, customer.id));
      await sendMessage(chatId, `✅ Hisobingiz muvaffaqiyatli ulandi!\n\nEndi buyurtmalaringiz holati haqida xabar olasiz. 🎉`);
    } catch {
      await sendMessage(chatId, "❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
    return;
  }

  const adminIds = await getAdminIds();
  if (!adminIds.includes(from.id)) return;

  if (text === "/admins") {
    await sendMessage(chatId, `👥 <b>Adminlar ro'yxati:</b>\n${adminIds.map(id => `• <code>${id}</code>`).join("\n")}`);
    return;
  }

  if (text?.startsWith("/addadmin ")) {
    const newId = parseInt(text.split(" ")[1]);
    if (isNaN(newId)) { await sendMessage(chatId, "❌ Noto'g'ri ID"); return; }
    if (adminIds.includes(newId)) { await sendMessage(chatId, "⚠️ Bu ID allaqachon admin."); return; }
    await setAdminIds([...adminIds, newId]);
    await sendMessage(chatId, `✅ Admin qo'shildi: <code>${newId}</code>`);
    return;
  }

  if (text?.startsWith("/removeadmin ")) {
    const rmId = parseInt(text.split(" ")[1]);
    if (isNaN(rmId)) { await sendMessage(chatId, "❌ Noto'g'ri ID"); return; }
    await setAdminIds(adminIds.filter(a => a !== rmId));
    await sendMessage(chatId, `✅ Admin o'chirildi: <code>${rmId}</code>`);
    return;
  }

  if (text === "/help") {
    await sendMessage(chatId,
      `📋 <b>Admin buyruqlari:</b>\n\n` +
      `/admins — adminlar ro'yxati\n` +
      `/addadmin &lt;id&gt; — admin qo'shish\n` +
      `/removeadmin &lt;id&gt; — admin o'chirish`
    );
    return;
  }
}

async function poll(): Promise<void> {
  if (!polling) return;
  try {
    const result: any = await tg("getUpdates", { offset: lastUpdateId + 1, timeout: 25, allowed_updates: ["message"] });
    if (result?.ok && result.result?.length > 0) {
      for (const update of result.result) {
        lastUpdateId = update.update_id;
        processUpdate(update).catch(() => {});
      }
    }
  } catch {}
  if (polling) setTimeout(poll, 1000);
}

export function startPolling(): void {
  if (!BOT_TOKEN || polling) return;
  polling = true;
  console.log("🤖 Telegram bot started");
  poll();
}
