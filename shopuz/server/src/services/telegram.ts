import { db } from "../db.js";
import { settingsTable, customersTable, ordersTable } from "../schema.js";
import { eq, desc } from "drizzle-orm";
import type { Request, Response } from "express";
import { appendFileSync, mkdirSync } from "fs";
import path from "path";

const LOG_DIR = path.join(process.env.HOME || "/home/fresh-uz", "public_html/app/tmp");
const LOG_FILE = path.join(LOG_DIR, "tg.log");

function tgLog(msg: string) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
  console.log("[TG]", msg);
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8359379882:AAF3LbwKc-XKMZF7ibW3U42xD2tVp45y5yo";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DEFAULT_ADMINS = [214840221, 7157868450];

async function tg(method: string, body: object): Promise<any> {
  try {
    const r = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await r.json();
    if (!result.ok) tgLog(`tg.${method} FAILED: ${JSON.stringify(result)}`);
    return result;
  } catch (e) {
    tgLog(`tg.${method} ERROR: ${String(e)}`);
    return null;
  }
}

export async function sendMessage(chatId: number | string, text: string): Promise<any> {
  tgLog(`sendMessage → ${chatId}`);
  const result = await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
  tgLog(`sendMessage ← ${chatId}: ok=${result?.ok}`);
  return result;
}

async function sendMessageWithButton(chatId: number | string, text: string, buttonText: string, buttonUrl: string): Promise<any> {
  tgLog(`sendMessageWithButton → ${chatId}`);
  const result = await tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: buttonText, url: buttonUrl }]]
    }
  });
  tgLog(`sendMessageWithButton ← ${chatId}: ok=${result?.ok}`);
  return result;
}

async function sendWithKeyboard(chatId: number | string, text: string): Promise<any> {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      keyboard: [
        [{ text: "📦 Buyurtmalarim" }, { text: "🛒 Savat" }],
        [{ text: "❓ Yordam" }, { text: "🔗 Hisobni ulash" }],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  });
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
  tgLog(`notifyAdmins → ids: ${adminIds.join(",")}`);
  await Promise.all(adminIds.map(id => sendMessage(id, text)));
}

const STATUS_MESSAGES: Record<string, string> = {
  new: "🆕 Buyurtmangiz qabul qilindi",
  preparing: "👨‍🍳 Buyurtmangiz tayyorlanmoqda",
  delivered: "🎉 Buyurtmangiz yetkazildi!",
  cancelled: "❌ Buyurtmangiz bekor qilindi",
};

export async function notifyCustomerOrderStatus(customerId: number, orderId: number, status: string): Promise<void> {
  tgLog(`notifyCustomer: customerId=${customerId} orderId=${orderId} status=${status}`);
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
    tgLog(`notifyCustomer: telegramId=${customer?.telegramId ?? "null"}`);
    if (!customer?.telegramId) {
      tgLog(`notifyCustomer: skipping — no telegramId for customer ${customerId}`);
      return;
    }
    const msg = STATUS_MESSAGES[status];
    if (!msg) {
      tgLog(`notifyCustomer: skipping — no message for status "${status}"`);
      return;
    }
    await sendMessage(customer.telegramId, `${msg}\n\n📦 Buyurtma #${orderId}`);
  } catch (e) {
    tgLog(`notifyCustomer ERROR: ${String(e)}`);
  }
}

async function processUpdate(update: any): Promise<void> {
  tgLog(`processUpdate: ${JSON.stringify(update).substring(0, 200)}`);

  if (!update.message) {
    tgLog("processUpdate: no message field, skipping");
    return;
  }
  const { chat, text, from } = update.message;
  const chatId: number = chat.id;
  tgLog(`processUpdate: chatId=${chatId} text="${text}" fromId=${from?.id}`);

  if (text === "/start" || text?.startsWith("/start ")) {
    tgLog("processUpdate: handling /start");
    await sendWithKeyboard(
      chatId,
      `Assalomu aleykum! Xush kelibsiz <b>Fresh 777</b> botga! 🛍️\n\n` +
      `Buyurtma berish va kuzatish uchun quyidagi tugmalardan foydalaning 👇\n\n` +
      `📱 Hisobingizni ulash uchun <b>Hisobni ulash</b> tugmasini bosing.`
    );
    return;
  }

  if (text?.startsWith("/link ") || text === "🔗 Hisobni ulash") {
    if (text === "🔗 Hisobni ulash") {
      await sendMessage(chatId,
        `📱 Hisobni ulash uchun telefon raqamingizni yuboring:\n\nFormat: <code>/link +998901234567</code>`
      );
      return;
    }
    const phone = text.substring(6).trim();
    tgLog(`processUpdate: /link phone="${phone}" chatId=${chatId}`);
    if (!phone) { await sendMessage(chatId, "❌ Format: /link +998901234567"); return; }
    try {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
      if (!customer) {
        tgLog(`processUpdate: /link — customer not found for phone ${phone}`);
        await sendMessage(chatId, "❌ Bu telefon raqam topilmadi. Avval saytda ro'yxatdan o'ting.");
        return;
      }
      await db.update(customersTable).set({ telegramId: String(chatId) }).where(eq(customersTable.id, customer.id));
      tgLog(`processUpdate: /link — linked customer ${customer.id} to chatId ${chatId}`);
      await sendWithKeyboard(chatId,
        `✅ Hisobingiz muvaffaqiyatli ulandi!\n\nEndi buyurtmalaringiz holati haqida xabar olasiz 🎉\n\nQuyidagi tugmalardan foydalaning 👇`
      );
    } catch (e) {
      tgLog(`processUpdate: /link ERROR: ${String(e)}`);
      await sendMessage(chatId, "❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
    return;
  }

  // Foydalanuvchi tugmalari
  if (text === "📦 Buyurtmalarim") {
    try {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.telegramId, String(chatId))).limit(1);
      if (!customer) {
        await sendMessage(chatId,
          `❗ Hisobingiz ulanmagan.\n\n/link +998XXXXXXXXX buyrug'i orqali hisobingizni ulang.`
        );
        return;
      }
      const orders = await db.select().from(ordersTable)
        .where(eq(ordersTable.customerId, customer.id))
        .orderBy(desc(ordersTable.id))
        .limit(5);
      if (orders.length === 0) {
        await sendMessage(chatId, "📦 Hozircha buyurtmalaringiz yo'q.");
        return;
      }
      const statusEmoji: Record<string, string> = {
        new: "🆕", preparing: "👨‍🍳", delivered: "✅", cancelled: "❌",
      };
      const statusName: Record<string, string> = {
        new: "Yangi", preparing: "Tayyorlanmoqda", delivered: "Yetkazildi", cancelled: "Bekor qilindi",
      };
      const lines = orders.map(o =>
        `${statusEmoji[o.status] || "📦"} <b>Buyurtma #${o.id}</b> — ${statusName[o.status] || o.status}\n` +
        `💰 ${Number(o.totalAmount).toLocaleString()} so'm\n` +
        `📅 ${new Date(o.createdAt).toLocaleDateString("ru-RU")}`
      );
      await sendMessageWithButton(
        chatId,
        `📦 <b>So'nggi buyurtmalaringiz:</b>\n\n${lines.join("\n\n")}`,
        "🔍 Batafsil ko'rish",
        "https://fresh-777.uz/orders"
      );
    } catch (e) {
      tgLog(`processUpdate: buyurtmalarim ERROR: ${String(e)}`);
      await sendMessage(chatId, "❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
    return;
  }

  if (text === "🛒 Savat") {
    await sendMessageWithButton(
      chatId,
      `🛒 <b>Savat</b>\n\nSavatchangizni ko'rish va buyurtma berish uchun saytga o'ting 👇`,
      "🛒 Savatni ko'rish",
      "https://fresh-777.uz/cart"
    );
    return;
  }

  if (text === "❓ Yordam") {
    await sendMessage(chatId,
      `❓ <b>Yordam</b>\n\n` +
      `📱 Buyurtma berish: <a href="https://fresh-777.uz">fresh-777.uz</a>\n\n` +
      `🔗 Hisobni ulash:\n<code>/link +998901234567</code>\n(Telefon raqamingizni kiriting)\n\n` +
      `📦 Buyurtmalarni ko'rish: <b>Buyurtmalarim</b> tugmasini bosing\n\n` +
      `☎️ Qo'ng'iroq qilish: +998 (XX) XXX-XX-XX`
    );
    return;
  }

  const adminIds = await getAdminIds();
  tgLog(`processUpdate: adminIds=${adminIds.join(",")} fromId=${from?.id} isAdmin=${adminIds.includes(from?.id)}`);

  if (!adminIds.includes(from?.id)) {
    tgLog(`processUpdate: non-admin message from ${from?.id}, ignoring`);
    await sendMessage(chatId,
      `❗ Bu buyruq tanilmadi.\n\nQuyidagi tugmalardan foydalaning yoki <b>Yordam</b> tugmasini bosing.`
    );
    return;
  }

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
      `/removeadmin &lt;id&gt; — admin o'chirish\n\n` +
      `👤 <b>Mijoz buyruqlari:</b>\n` +
      `/link +998901234567 — hisobni ulash`
    );
    return;
  }
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  tgLog(`Webhook received: ${JSON.stringify(req.body).substring(0, 300)}`);
  try {
    await processUpdate(req.body);
  } catch (e) {
    tgLog(`processUpdate error: ${String(e)}`);
  }
  res.sendStatus(200);
}

export async function registerWebhook(baseUrl: string): Promise<void> {
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  try {
    const result = await tg("setWebhook", {
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    });
    console.log("🤖 Telegram webhook registered:", webhookUrl, JSON.stringify(result));
  } catch (e) {
    console.error("🤖 Telegram webhook error:", e);
  }
}
