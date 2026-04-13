import { Router } from "express";
import { db } from "../db.js";
import { notificationsTable, customersTable } from "../schema.js";
import { eq, isNotNull } from "drizzle-orm";
import { sendMessage } from "../services/telegram.js";

const router = Router();

router.get("/notifications", async (_req, res): Promise<void> => {
  try {
    const notifications = await db.select().from(notificationsTable).orderBy(notificationsTable.id);
    res.json([...notifications].reverse());
  } catch (e) {
    res.json([]);
  }
});

router.post("/notifications/send", async (req, res): Promise<void> => {
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "message required" }); return; }
  const result = await db.insert(notificationsTable).values({ message });
  const [n] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, result[0].insertId)).limit(1);

  // Telegram orqali barcha ulangan foydalanuvchilarga xabar yuborish
  try {
    const customers = await db.select().from(customersTable).where(isNotNull(customersTable.telegramId));
    const text = `🔔 <b>Assalomu aleykum!</b>\n\n${message}`;
    await Promise.allSettled(
      customers
        .filter(c => c.telegramId)
        .map(c => sendMessage(c.telegramId as string, text))
    );
  } catch {}

  res.status(201).json(n);
});

router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  try {
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/notifications/read", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  await db.update(customersTable).set({ lastNotificationReadAt: new Date() }).where(eq(customersTable.id, customerId));
  res.json({ success: true });
});

export default router;
