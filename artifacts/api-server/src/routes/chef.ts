import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, settingsTable, ordersTable, messagesTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/chef/login", async (req, res): Promise<void> => {
  const { password } = req.body;
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "chefPassword")).limit(1);
  const chefPass = setting?.value ?? "chef123";
  if (!password || password !== chefPass) {
    res.status(401).json({ error: "Parol noto'g'ri" });
    return;
  }
  res.json({ success: true, role: "chef" });
});

router.get("/chef/orders", async (req, res): Promise<void> => {
  const token = req.headers["x-chef-token"];
  if (token !== "chef-authenticated") { res.status(401).json({ error: "Unauthorized" }); return; }
  const orders = await db.select().from(ordersTable)
    .where(inArray(ordersTable.status, ["new", "preparing", "ready"] as any))
    .orderBy(ordersTable.createdAt);
  res.json(orders);
});

router.patch("/chef/orders/:id/status", async (req, res): Promise<void> => {
  const token = req.headers["x-chef-token"];
  if (token !== "chef-authenticated") { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!["preparing", "ready", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  await db.update(ordersTable).set({ status } as any).where(eq(ordersTable.id, id));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  res.json(order);
});

router.get("/chef/messages", async (req, res): Promise<void> => {
  const token = req.headers["x-chef-token"];
  if (token !== "chef-authenticated") { res.status(401).json({ error: "Unauthorized" }); return; }

  const { customersTable } = await import("@workspace/db");
  const messages = await db.select({
    id: messagesTable.id,
    customerId: messagesTable.customerId,
    senderType: messagesTable.senderType,
    text: messagesTable.text,
    isRead: messagesTable.isRead,
    createdAt: messagesTable.createdAt,
    customerName: customersTable.name,
    customerPhone: customersTable.phone,
  })
    .from(messagesTable)
    .innerJoin(customersTable, eq(messagesTable.customerId, customersTable.id))
    .orderBy(messagesTable.createdAt);

  const map = new Map<number, any>();
  for (const m of messages) {
    if (!map.has(m.customerId)) {
      map.set(m.customerId, {
        customerId: m.customerId,
        customerName: m.customerName,
        customerPhone: m.customerPhone,
        messages: [],
        unreadCount: 0,
        lastMessage: null,
      });
    }
    const chat = map.get(m.customerId)!;
    const s = { ...m, createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt };
    chat.messages.push(s);
    chat.lastMessage = s;
    if (!m.isRead && m.senderType === "customer") chat.unreadCount++;
  }
  res.json(Array.from(map.values()));
});

router.post("/chef/messages", async (req, res): Promise<void> => {
  const token = req.headers["x-chef-token"];
  if (token !== "chef-authenticated") { res.status(401).json({ error: "Unauthorized" }); return; }
  const { customerId, text } = req.body;
  if (!customerId || !text?.trim()) {
    res.status(400).json({ error: "customerId and text required" });
    return;
  }
  const { customersTable } = await import("@workspace/db");
  const { sendTelegramToCustomer } = await import("../telegram.js");
  const [message] = await db.insert(messagesTable).values({
    customerId,
    senderType: "admin",
    text: text.trim(),
  }).returning();
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
  if (customer?.telegramId) {
    sendTelegramToCustomer(customer.telegramId, `💬 <b>Qo'llab-quvvatlash xabari</b>\n\n${text.trim()}`).catch(() => {});
  }
  res.status(201).json({ ...message, createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt });
});

export default router;
