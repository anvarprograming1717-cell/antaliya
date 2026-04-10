import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db.js";
import { messagesTable, customersTable } from "../schema.js";

const router = Router();

router.get("/messages", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const msgs = await db.select().from(messagesTable).where(eq(messagesTable.customerId, customerId));
  // Mark customer messages as read
  await db.update(messagesTable).set({ isRead: true }).where(and(eq(messagesTable.customerId, customerId), eq(messagesTable.senderType, "admin")));
  res.json(msgs);
});

router.post("/messages", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { text, mediaUrl, mediaType } = req.body;
  const [msg] = await db.insert(messagesTable).values({ customerId, senderType: "customer", text: text ?? "", mediaUrl: mediaUrl ?? null, mediaType: mediaType ?? null }).returning();
  res.status(201).json(msg);
});

// Admin: get all conversations
router.get("/admin/messages", async (_req, res): Promise<void> => {
  const customers = await db.select().from(customersTable);
  const result = await Promise.all(customers.map(async (c) => {
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.customerId, c.id));
    const unread = msgs.filter(m => m.senderType === "customer" && !m.isRead).length;
    const last = msgs[msgs.length - 1];
    return { customerId: c.id, customerName: c.name, customerPhone: c.phone, unreadCount: unread, lastMessage: last ?? null, messages: msgs };
  }));
  res.json(result.filter(r => r.messages.length > 0));
});

router.post("/admin/messages/:customerId", async (req, res): Promise<void> => {
  const customerId = parseInt(req.params.customerId);
  const { text, mediaUrl, mediaType } = req.body;
  const [msg] = await db.insert(messagesTable).values({ customerId, senderType: "admin", text: text ?? "", mediaUrl: mediaUrl ?? null, mediaType: mediaType ?? null }).returning();
  // Mark customer messages as read
  await db.update(messagesTable).set({ isRead: true }).where(and(eq(messagesTable.customerId, customerId), eq(messagesTable.senderType, "customer")));
  res.status(201).json(msg);
});

router.delete("/messages", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  await db.delete(messagesTable).where(eq(messagesTable.customerId, customerId));
  res.json({ success: true });
});

router.delete("/admin/messages/:customerId", async (req, res): Promise<void> => {
  await db.delete(messagesTable).where(eq(messagesTable.customerId, parseInt(req.params.customerId)));
  res.json({ success: true });
});

export default router;
