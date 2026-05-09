import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, customersTable, notificationsTable } from "@workspace/db";
import { getBotToken, handleTelegramWebhook } from "../telegram.js";

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
    await db.update(customersTable)
      .set({ lastNotificationReadAt: new Date() })
      .where(eq(customersTable.id, customerId));
  }
  res.json({ success: true });
});

router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
  res.json({ success: true });
});

router.post("/notifications/send", async (req, res): Promise<void> => {
  const { message } = req.body;
  if (!message?.trim()) {
    res.status(400).json({ error: "Message required" });
    return;
  }

  await db.insert(notificationsTable).values({ message: message.trim() });

  const token = await getBotToken();
  if (token) {
    const customers = await db.select().from(customersTable);
    await Promise.allSettled(
      customers.filter(c => c.telegramId).map(c =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: c.telegramId, text: `🔔 <b>Xabarnoma</b>\n\n${message.trim()}`, parse_mode: "HTML" }),
        })
      )
    );
  }

  res.json({ success: true, message: "Xabarnoma yuborildi" });
});

router.post("/telegram-webhook", async (req, res): Promise<void> => {
  try {
    await handleTelegramWebhook(req.body);
  } catch (_) {}
  res.json({ success: true });
});

export default router;
