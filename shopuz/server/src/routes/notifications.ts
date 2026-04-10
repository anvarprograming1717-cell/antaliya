import { Router } from "express";
import { db } from "../db.js";
import { notificationsTable, customersTable } from "../schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/notifications", async (_req, res): Promise<void> => {
  const notifications = await db.select().from(notificationsTable).orderBy(notificationsTable.id);
  res.json(notifications.reverse());
});

router.post("/notifications/send", async (req, res): Promise<void> => {
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "message required" }); return; }
  const [n] = await db.insert(notificationsTable).values({ message }).returning();
  res.status(201).json(n);
});

router.post("/notifications/read", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  await db.update(customersTable).set({ lastNotificationReadAt: new Date().toISOString() }).where(eq(customersTable.id, customerId));
  res.json({ success: true });
});

export default router;
