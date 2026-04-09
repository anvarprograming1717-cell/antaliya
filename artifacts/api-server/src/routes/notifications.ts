import { Router, type IRouter } from "express";
import { db, customersTable, notificationsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const list = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(50);
  res.json(list.map(n => ({
    ...n,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  })));
});

router.post("/notifications/read", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (customerId) {
    const { eq } = await import("drizzle-orm");
    await db.update(customersTable)
      .set({ lastNotificationReadAt: new Date() })
      .where(eq(customersTable.id, customerId));
  }
  res.json({ success: true });
});

router.post("/notifications/send", async (req, res): Promise<void> => {
  const { message } = req.body;
  if (!message?.trim()) {
    res.status(400).json({ error: "Message required" });
    return;
  }

  // Save to DB so all customers can see it in-app
  await db.insert(notificationsTable).values({ message: message.trim() });

  // Also try to send via Telegram if token is configured
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (TELEGRAM_BOT_TOKEN) {
    const customers = await db.select().from(customersTable);
    for (const customer of customers.filter(c => c.telegramId)) {
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: customer.telegramId, text: message }),
        });
      } catch (_) {}
    }
  }

  res.json({ success: true, message: "Xabarnoma yuborildi" });
});

router.post("/telegram-webhook", async (req, res): Promise<void> => {
  const update = req.body;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    res.json({ success: true });
    return;
  }
  if (update?.message) {
    const chatId = String(update.message.chat.id);
    const text = update.message.text ?? "";
    const phone = text.replace(/[^\d+]/g, "");
    if (phone.length >= 9) {
      const { eq } = await import("drizzle-orm");
      await db.update(customersTable)
        .set({ telegramId: chatId })
        .where(eq(customersTable.phone, phone));
    }
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Siz muvaffaqiyatli ro'yxatdan o'tdingiz! Endi xabarnomalar olasiz.",
      }),
    });
  }
  res.json({ success: true });
});

export default router;
