import { db, settingsTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function getMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function getBotToken(): Promise<string | null> {
  const map = await getMap();
  return map.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || null;
}

export async function getAdminIds(): Promise<string[]> {
  const map = await getMap();
  try { return JSON.parse(map.telegramAdminIds || "[]"); } catch { return []; }
}

export async function getChefIds(): Promise<string[]> {
  const map = await getMap();
  try { return JSON.parse(map.telegramChefIds || "[]"); } catch { return []; }
}

export async function getCourierIds(): Promise<string[]> {
  const map = await getMap();
  try { return JSON.parse(map.telegramCourierIds || "[]"); } catch { return []; }
}

async function sendMsg(token: string, chatId: string, text: string, extra?: object): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
    });
  } catch (_) {}
}

export async function sendTelegramToAdmins(text: string): Promise<void> {
  const token = await getBotToken();
  if (!token) return;
  const ids = await getAdminIds();
  await Promise.allSettled(ids.map(id => sendMsg(token, id, text)));
}

export async function sendTelegramToChefs(text: string): Promise<void> {
  const token = await getBotToken();
  if (!token) return;
  const ids = await getChefIds();
  await Promise.allSettled(ids.map(id => sendMsg(token, id, text)));
}

export async function sendTelegramToCouriers(text: string): Promise<void> {
  const token = await getBotToken();
  if (!token) return;
  const ids = await getCourierIds();
  await Promise.allSettled(ids.map(id => sendMsg(token, id, text)));
}

export async function sendTelegramToCustomer(telegramId: string, text: string): Promise<void> {
  const token = await getBotToken();
  if (!token) return;
  await sendMsg(token, telegramId, text);
}

export async function handleTelegramWebhook(update: any): Promise<void> {
  const token = await getBotToken();
  if (!token) return;

  const message = update.message;
  if (!message) return;

  const chatId = String(message.chat.id);
  const text = (message.text ?? "").trim();
  const firstName = message.from?.first_name ?? "Foydalanuvchi";

  const map = await getMap();
  const siteName = map.siteName || "Do'konimiz";
  const siteUrl = map.botSiteUrl || "";
  const deliveryUrl = map.botDeliveryUrl || siteUrl;

  if (text === "/start") {
    const welcomeText = `Assalomu aleykum, <b>${firstName}</b>! 👋\n\n<b>${siteName}</b> botiga xush kelibsiz!\n\nMenyu va buyurtma berish uchun quyidagi tugmani bosing 👇`;

    const buttons: any[][] = [];
    if (siteUrl) {
      buttons.push([{ text: "🛍 Menyu va buyurtma berish", web_app: { url: siteUrl } }]);
    }
    if (deliveryUrl) {
      buttons.push([{ text: "🚚 Yetkazib berish xizmati", web_app: { url: deliveryUrl } }]);
    }

    const extra: any = {};
    if (buttons.length > 0) {
      extra.reply_markup = { inline_keyboard: buttons };
    }

    await sendMsg(token, chatId, welcomeText, extra);
    return;
  }

  const phone = text.replace(/[^\d+]/g, "");
  if (phone.length >= 9) {
    await db.update(customersTable)
      .set({ telegramId: chatId })
      .where(eq(customersTable.phone, phone));
    await sendMsg(token, chatId, `✅ Telefon raqamingiz muvaffaqiyatli bog'landi!\n\nEndi buyurtmalar va xabarnomalar Telegramda keladi.`);
    return;
  }

  if (siteUrl) {
    await sendMsg(token, chatId, `Menyu va buyurtma berish uchun quyidagi tugmani bosing 👇`, {
      reply_markup: { inline_keyboard: [[{ text: "🛍 Buyurtma berish", web_app: { url: siteUrl } }]] }
    });
  } else {
    await sendMsg(token, chatId, `Menyu va buyurtma berish uchun /start ni yuboring.`);
  }
}
