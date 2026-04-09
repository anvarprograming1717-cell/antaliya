import { Router, type IRouter } from "express";
import { db, customersTable } from "@workspace/db";
import { SendNotificationBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/notifications/send", async (req, res): Promise<void> => {
  const parsed = SendNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    res.json({ success: true, message: "No Telegram bot token configured" });
    return;
  }

  const customers = await db.select().from(customersTable);
  const customersWithTelegram = customers.filter(c => c.telegramId);

  let sent = 0;
  for (const customer of customersWithTelegram) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: customer.telegramId,
          text: parsed.data.message,
        }),
      });
      sent++;
    } catch (_) {}
  }

  res.json({ success: true, message: `Sent to ${sent} users` });
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
