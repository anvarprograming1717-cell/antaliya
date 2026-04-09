import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, messagesTable } from "@workspace/db";
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
  res.status(201).json(serialize(message));
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
