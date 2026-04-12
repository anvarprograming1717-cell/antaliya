import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db.js";
import { messagesTable, customersTable } from "../schema.js";

const router = Router();

// GET /api/messages — customer o'z xabarlarini ko'radi
// GET /api/messages?customerId=X — admin belgilangan mijoz xabarlarini ko'radi
router.get("/messages", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  const queryCustomerId = req.query.customerId ? parseInt(req.query.customerId as string) : null;

  // Admin so'rovi: query param orqali customerId berilgan
  if (queryCustomerId) {
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.customerId, queryCustomerId));
    res.json(msgs);
    return;
  }

  // Mijoz o'z xabarlarini ko'rishi
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const msgs = await db.select().from(messagesTable).where(eq(messagesTable.customerId, customerId));
  await db.update(messagesTable).set({ isRead: true }).where(
    and(eq(messagesTable.customerId, customerId), eq(messagesTable.senderType, "admin"))
  );
  res.json(msgs);
});

// POST /api/messages — customer yozadi YOKI admin yozadi (senderType: "admin" + customerId bilan)
router.post("/messages", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  const { text, mediaUrl, mediaType, senderType, customerId: bodyCustomerId } = req.body;

  // Admin xabari: senderType === "admin" va body da customerId bor
  if (senderType === "admin" && bodyCustomerId) {
    const result = await db.insert(messagesTable).values({
      customerId: bodyCustomerId,
      senderType: "admin",
      text: text ?? "",
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
    });
    const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, result[0].insertId)).limit(1);
    // Mijozdan kelgan xabarlarni o'qilgan qilib belgilash
    await db.update(messagesTable).set({ isRead: true }).where(
      and(eq(messagesTable.customerId, bodyCustomerId), eq(messagesTable.senderType, "customer"))
    );
    res.status(201).json(msg);
    return;
  }

  // Mijoz xabari
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const result = await db.insert(messagesTable).values({
    customerId,
    senderType: "customer",
    text: text ?? "",
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
  });
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, result[0].insertId)).limit(1);
  res.status(201).json(msg);
});

// Admin: barcha mijozlar bilan suhbatlar (faqat xabar bor bo'lganlar)
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

// Admin: muayyan mijozga javob berish
router.post("/admin/messages/:customerId", async (req, res): Promise<void> => {
  const customerId = parseInt(req.params.customerId);
  const { text, mediaUrl, mediaType } = req.body;
  const result = await db.insert(messagesTable).values({ customerId, senderType: "admin", text: text ?? "", mediaUrl: mediaUrl ?? null, mediaType: mediaType ?? null });
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, result[0].insertId)).limit(1);
  await db.update(messagesTable).set({ isRead: true }).where(and(eq(messagesTable.customerId, customerId), eq(messagesTable.senderType, "customer")));
  res.status(201).json(msg);
});

// Mijoz o'z suhbatini o'chiradi
router.delete("/messages", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  await db.delete(messagesTable).where(eq(messagesTable.customerId, customerId));
  res.json({ success: true });
});

// Admin: mijoz suhbatini o'chiradi
router.delete("/admin/messages/:customerId", async (req, res): Promise<void> => {
  await db.delete(messagesTable).where(eq(messagesTable.customerId, parseInt(req.params.customerId)));
  res.json({ success: true });
});

export default router;
