import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, messagesTable, customersTable } from "@workspace/db";
import { sendTelegramToAdmins, sendTelegramToChefs, sendTelegramToCustomer } from "../telegram.js";
import {
  ListMessagesQueryParams,
  MarkMessagesReadBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serialize(m: any) {
  return {
    ...m,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  };
}

router.get("/messages", async (req, res): Promise<void> => {
  const query = ListMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const customerId = (req as any).customerId;
  const targetId = query.data.customerId ?? customerId;
  if (!targetId) {
    res.status(400).json({ error: "customerId required" });
    return;
  }
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.customerId, targetId))
    .orderBy(messagesTable.createdAt);
  res.json(messages.map(serialize));
});

router.post("/messages", async (req, res): Promise<void> => {
  const { text, senderType, customerId: bodyCustomerId, mediaUrl, mediaType } = req.body;
  if (!senderType || !["customer", "admin"].includes(senderType)) {
    res.status(400).json({ error: "senderType required" });
    return;
  }
  const customerId = (req as any).customerId;
  const msgCustomerId = bodyCustomerId ?? customerId;
  if (!msgCustomerId) {
    res.status(400).json({ error: "customerId required" });
    return;
  }
  if (!text && !mediaUrl) {
    res.status(400).json({ error: "text or mediaUrl required" });
    return;
  }
  const [message] = await db.insert(messagesTable).values({
    customerId: msgCustomerId,
    senderType,
    text: text ?? "",
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
  }).returning();

  const customer = await db.select().from(customersTable).where(eq(customersTable.id, msgCustomerId)).limit(1);
  const customerName = customer[0]?.name ?? "Noma'lum";
  const customerPhone = customer[0]?.phone ?? "";
  const customerTelegramId = customer[0]?.telegramId ?? null;

  if (senderType === "customer") {
    const preview = text ? (text.length > 100 ? text.slice(0, 100) + "…" : text) : (mediaType === "image" ? "🖼 Rasm yuborildi" : "📎 Fayl yuborildi");
    const tgText = `💬 <b>Yangi xabar</b>\n👤 ${customerName} (${customerPhone})\n\n${preview}`;
    sendTelegramToAdmins(tgText).catch(() => {});
    sendTelegramToChefs(tgText).catch(() => {});
  }

  if (senderType === "admin" && customerTelegramId) {
    const replyText = `💬 <b>Qo'llab-quvvatlash xabari</b>\n\n${text ?? ""}`;
    sendTelegramToCustomer(customerTelegramId, replyText).catch(() => {});
  }

  res.status(201).json(serialize(message));
});

router.delete("/messages", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  const queryCustomerId = req.query.customerId ? parseInt(req.query.customerId as string, 10) : null;
  const targetId = queryCustomerId ?? customerId;
  if (!targetId) {
    res.status(400).json({ error: "customerId required" });
    return;
  }
  await db.delete(messagesTable).where(eq(messagesTable.customerId, targetId));
  res.json({ success: true });
});

router.patch("/messages/read", async (req, res): Promise<void> => {
  const parsed = MarkMessagesReadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.customerId, parsed.data.customerId),
        eq(messagesTable.senderType, parsed.data.senderType === "customer" ? "admin" : "customer"),
      )
    );
  res.json({ success: true });
});

export default router;
