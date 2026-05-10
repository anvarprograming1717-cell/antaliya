import { db, settingsTable, customersTable, cartTable, productsTable, ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

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

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🛒 Savatcha" }, { text: "📦 Buyurtmalarim" }],
  ],
  resize_keyboard: true,
  persistent: true,
};

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

export async function sendTelegramToCourier(courierTelegramId: string, text: string): Promise<void> {
  const token = await getBotToken();
  if (!token) return;
  await sendMsg(token, courierTelegramId, text);
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

  // /start command
  if (text === "/start") {
    const welcomeText = `Assalomu aleykum, <b>${firstName}</b>! 👋\n\n<b>${siteName}</b>ga xush kelibsiz!\n\nBuyurtma berish uchun quyidagi tugmani bosing 👇`;
    await sendMsg(token, chatId, welcomeText, { reply_markup: MAIN_KEYBOARD });
    if (siteUrl) {
      await sendMsg(token, chatId, "🛍 Do'konni ochish:", {
        reply_markup: {
          inline_keyboard: [[{ text: "🛍 Do'konni ochish", web_app: { url: siteUrl } }]],
        },
      });
    }
    return;
  }

  // Savatcha button
  if (text === "🛒 Savatcha") {
    const customers = await db.select().from(customersTable).where(eq(customersTable.telegramId, chatId)).limit(1);
    if (customers.length === 0) {
      const notLinkedText = siteUrl
        ? `❌ Siz hali saytga bog'lanmadingiz.\n\n<b>Bog'lash uchun:</b>\n1️⃣ Quyidagi tugmani bosib saytga kiring\n2️⃣ Ro'yxatdan o'ting\n3️⃣ Profilingizda <b>"Telegram botga ulanish"</b> tugmasini bosing\n\n<i>Yoki shunchaki telefon raqamingizni shu yerga yuboring:</i> <code>+998XXXXXXXXX</code>`
        : `❌ Siz hali saytga bog'lanmadingiz.\n\nTelefon raqamingizni yuboring: <code>+998XXXXXXXXX</code>`;
      const markup = siteUrl
        ? { inline_keyboard: [[{ text: "🛍 Saytga o'tish", web_app: { url: siteUrl } }]] }
        : MAIN_KEYBOARD;
      await sendMsg(token, chatId, notLinkedText, { reply_markup: markup });
      return;
    }
    const customer = customers[0];
    const cartItems = await db.select({
      id: cartTable.id,
      quantity: cartTable.quantity,
      product: productsTable,
    })
      .from(cartTable)
      .innerJoin(productsTable, eq(cartTable.productId, productsTable.id))
      .where(eq(cartTable.customerId, customer.id));

    if (cartItems.length === 0) {
      await sendMsg(token, chatId,
        "🛒 Savatchingiz bo'sh.\n\nMahsulot qo'shish uchun saytga o'ting.",
        { reply_markup: MAIN_KEYBOARD }
      );
      return;
    }

    const subtotal = cartItems.reduce((sum, item) =>
      sum + parseFloat(item.product.price as string) * item.quantity, 0);
    const itemLines = cartItems.map(item =>
      `  • ${item.product.name} × ${item.quantity} — <b>${(parseFloat(item.product.price as string) * item.quantity).toLocaleString()} so'm</b>`
    ).join("\n");

    const cartText = `🛒 <b>Savatchingiz:</b>\n\n${itemLines}\n\n💰 <b>Jami: ${subtotal.toLocaleString()} so'm</b>`;

    const inlineButtons: any[][] = siteUrl
      ? [[{ text: "✅ Buyurtma berish", web_app: { url: `${siteUrl}/cart` } }]]
      : [];

    await sendMsg(token, chatId, cartText, {
      reply_markup: inlineButtons.length > 0
        ? { inline_keyboard: inlineButtons }
        : MAIN_KEYBOARD,
    });
    return;
  }

  // Buyurtmalarim button
  if (text === "📦 Buyurtmalarim") {
    const customers = await db.select().from(customersTable).where(eq(customersTable.telegramId, chatId)).limit(1);
    if (customers.length === 0) {
      const notLinkedText = siteUrl
        ? `❌ Siz hali saytga bog'lanmadingiz.\n\n<b>Bog'lash uchun:</b>\n1️⃣ Quyidagi tugmani bosib saytga kiring\n2️⃣ Ro'yxatdan o'ting\n3️⃣ Profilingizda <b>"Telegram botga ulanish"</b> tugmasini bosing\n\n<i>Yoki shunchaki telefon raqamingizni shu yerga yuboring:</i> <code>+998XXXXXXXXX</code>`
        : `❌ Siz hali saytga bog'lanmadingiz.\n\nTelefon raqamingizni yuboring: <code>+998XXXXXXXXX</code>`;
      const markup = siteUrl
        ? { inline_keyboard: [[{ text: "🛍 Saytga o'tish", web_app: { url: siteUrl } }]] }
        : MAIN_KEYBOARD;
      await sendMsg(token, chatId, notLinkedText, { reply_markup: markup });
      return;
    }
    const customer = customers[0];
    const orders = await db.select().from(ordersTable)
      .where(eq(ordersTable.customerId, customer.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(5);

    if (orders.length === 0) {
      await sendMsg(token, chatId,
        "📦 Hali buyurtmangiz yo'q.\n\nBuyurtma berish uchun saytga o'ting.",
        { reply_markup: MAIN_KEYBOARD }
      );
      return;
    }

    const statusLabels: Record<string, string> = {
      new: "🆕 Yangi",
      preparing: "🍳 Tayyorlanmoqda",
      ready: "✅ Tayyor",
      delivering: "🚚 Yo'lda",
      delivered: "🎉 Yetkazildi",
      cancelled: "❌ Bekor qilindi",
    };

    const orderLines = orders.map(o =>
      `#${o.id} — ${statusLabels[o.status] || o.status} — <b>${parseFloat(o.totalPrice as string).toLocaleString()} so'm</b>`
    ).join("\n");

    const ordersText = `📦 <b>So'nggi buyurtmalaringiz:</b>\n\n${orderLines}`;

    const inlineButtons: any[][] = siteUrl
      ? [[{ text: "📋 Barchasi ko'rish", web_app: { url: `${siteUrl}/orders` } }]]
      : [];

    await sendMsg(token, chatId, ordersText, {
      reply_markup: inlineButtons.length > 0
        ? { inline_keyboard: inlineButtons }
        : MAIN_KEYBOARD,
    });
    return;
  }

  // Phone number registration
  const phone = text.replace(/[^\d+]/g, "");
  if (phone.length >= 7) {
    // Normalize: strip leading zeros/country code variants and match last 9 digits
    const digits = phone.replace(/^\+/, "");
    // Try exact match first, then suffix match (last 9 digits)
    const suffix = digits.slice(-9);
    const rows = await db.select().from(customersTable);
    const matched = rows.find(c => {
      if (!c.phone) return false;
      const cd = c.phone.replace(/[^\d]/g, "");
      return cd === digits || cd.endsWith(suffix);
    });
    if (matched) {
      await db.update(customersTable)
        .set({ telegramId: chatId })
        .where(eq(customersTable.id, matched.id));
      await sendMsg(token, chatId,
        `✅ Telefon raqamingiz muvaffaqiyatli bog'landi!\n\nEndi buyurtmalar va xabarnomalar Telegramda keladi.`,
        { reply_markup: MAIN_KEYBOARD }
      );
    } else {
      await sendMsg(token, chatId,
        `❌ Bu raqam bilan saytda hisob topilmadi.\n\nAvval saytga ro'yxatdan o'ting, so'ng telefon raqamingizni yuboring.`,
        { reply_markup: MAIN_KEYBOARD }
      );
    }
    return;
  }

  // Default reply
  if (siteUrl) {
    await sendMsg(token, chatId, "Menyu va buyurtma berish uchun quyidagi tugmani bosing 👇", {
      reply_markup: {
        inline_keyboard: [[{ text: "🛍 Buyurtma berish", web_app: { url: siteUrl } }]],
      },
    });
  } else {
    await sendMsg(token, chatId, "Buyurtmalaringizni ko'rish uchun /start ni yuboring.", {
      reply_markup: MAIN_KEYBOARD,
    });
  }
}
