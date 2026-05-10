import { Router, type IRouter } from "express";
import { eq, inArray, ilike, or } from "drizzle-orm";
import { db, settingsTable, ordersTable, orderItemsTable, messagesTable, customersTable, productsTable, coinTransactionsTable } from "@workspace/db";
import { sendTelegramToCouriers, sendTelegramToCustomer } from "../telegram.js";

const router: IRouter = Router();

function chefAuth(req: any, res: any): boolean {
  const token = req.headers["x-chef-token"];
  if (token !== "chef-authenticated") {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

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
  if (!chefAuth(req, res)) return;
  const orders = await db.select().from(ordersTable)
    .where(inArray(ordersTable.status, ["new", "preparing", "ready"] as any))
    .orderBy(ordersTable.createdAt);

  // For each order, check if any item is a coin product
  const enriched = await Promise.all(orders.map(async (order) => {
    const items = await db.select({
      id: orderItemsTable.id,
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      quantity: orderItemsTable.quantity,
      price: orderItemsTable.price,
      productImage: orderItemsTable.productImage,
    }).from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

    let hasCoinProduct = false;
    for (const item of items) {
      if (item.productId) {
        const [prod] = await db.select({ coinProduct: productsTable.coinProduct }).from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
        if (prod?.coinProduct) { hasCoinProduct = true; break; }
      }
    }

    const [customer] = await db.select({ name: customersTable.name, phone: customersTable.phone }).from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);

    return {
      ...order,
      totalPrice: parseFloat(order.totalPrice as string),
      deliveryFee: parseFloat(order.deliveryFee as string),
      total: parseFloat(order.totalPrice as string),
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
      items: items.map(i => ({ ...i, price: parseFloat(i.price as string) })),
      hasCoinProduct,
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone ?? null,
    };
  }));

  res.json(enriched);
});

router.patch("/chef/orders/:id/status", async (req, res): Promise<void> => {
  if (!chefAuth(req, res)) return;
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!["preparing", "ready", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  await db.update(ordersTable).set({ status } as any).where(eq(ordersTable.id, id));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
  const customerTelegramId = customer?.telegramId ?? null;

  const customerMessages: Record<string, string> = {
    preparing: `🍳 <b>Buyurtma #${id} tayyorlanmoqda</b>\n\nSizning buyurtmangiz qabul qilindi va tayyorlanmoqda. Iltimos kuting!`,
    ready: `✅ <b>Buyurtma #${id} tayyor!</b>\n\nSizning buyurtmangiz tayyor. Tez orada yetkazib beriladi!`,
    cancelled: `❌ <b>Buyurtma #${id} bekor qilindi</b>\n\nAfsuski, buyurtmangiz bekor qilindi. Aloqa uchun murojaat qiling.`,
  };
  if (customerTelegramId && customerMessages[status]) {
    sendTelegramToCustomer(customerTelegramId, customerMessages[status]).catch(() => {});
  }

  if (status === "ready") {
    const address = order.address ? `📍 ${order.address}` : "Olib ketish";
    const total = parseFloat(order.totalPrice as string).toLocaleString();
    const courierText = `📦 <b>Buyurtma #${id} tayyor!</b>\n👤 ${customer?.name ?? "Noma'lum"} (${customer?.phone ?? ""})\n${address}\n💰 ${total} so'm\n\nBuyurtmani olib ketish vaqti!`;
    sendTelegramToCouriers(courierText).catch(() => {});
  }

  res.json(order);
});

// ─── Chef Messages ─────────────────────────────────────────────────────────────

router.get("/chef/messages", async (req, res): Promise<void> => {
  if (!chefAuth(req, res)) return;

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
  if (!chefAuth(req, res)) return;
  const { customerId, text } = req.body;
  if (!customerId || !text?.trim()) {
    res.status(400).json({ error: "customerId and text required" });
    return;
  }
  const { sendTelegramToCustomer: sendTg } = await import("../telegram.js");
  const [message] = await db.insert(messagesTable).values({
    customerId,
    senderType: "admin",
    text: text.trim(),
  }).returning();
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
  if (customer?.telegramId) {
    sendTg(customer.telegramId, `💬 <b>Qo'llab-quvvatlash xabari</b>\n\n${text.trim()}`).catch(() => {});
  }
  res.status(201).json({ ...message, createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt });
});

// ─── Chef Customers (read-only, search, use-coins) ────────────────────────────

router.get("/chef/customers", async (req, res): Promise<void> => {
  if (!chefAuth(req, res)) return;
  const { phone } = req.query as { phone?: string };

  let customers;
  if (phone && phone.trim()) {
    const q = `%${phone.trim()}%`;
    customers = await db.select({
      id: customersTable.id,
      name: customersTable.name,
      phone: customersTable.phone,
      coins: customersTable.coins,
      telegramId: customersTable.telegramId,
      createdAt: customersTable.createdAt,
    }).from(customersTable)
      .where(ilike(customersTable.phone, q))
      .orderBy(customersTable.createdAt)
      .limit(20);
  } else {
    customers = await db.select({
      id: customersTable.id,
      name: customersTable.name,
      phone: customersTable.phone,
      coins: customersTable.coins,
      telegramId: customersTable.telegramId,
      createdAt: customersTable.createdAt,
    }).from(customersTable)
      .orderBy(customersTable.createdAt)
      .limit(100);
  }

  res.json(customers.map(c => ({
    ...c,
    coins: c.coins ?? 0,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  })));
});

router.post("/chef/customers/:id/use-coins", async (req, res): Promise<void> => {
  if (!chefAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id)).limit(1);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const { amount, reason } = req.body;
  const deduct = parseInt(amount, 10) || customer.coins || 0;
  if (deduct <= 0) { res.status(400).json({ error: "No coins to deduct" }); return; }

  const actualDeduct = Math.min(deduct, customer.coins ?? 0);
  const newCoins = Math.max(0, (customer.coins ?? 0) - actualDeduct);

  await db.update(customersTable).set({ coins: newCoins }).where(eq(customersTable.id, id));
  await db.insert(coinTransactionsTable).values({
    customerId: id,
    amount: -actualDeduct,
    reason: reason || "Chef paneldan coin ishlatildi",
  });

  // Notify customer via Telegram
  if (customer.telegramId) {
    sendTelegramToCustomer(customer.telegramId,
      `🪙 <b>${actualDeduct} coin ishlatildi</b>\n\nSizning hisobingizdan ${actualDeduct} coin yechildi.\nQolgan coinlar: ${newCoins} 🪙`
    ).catch(() => {});
  }

  res.json({ success: true, deducted: actualDeduct, newCoins, customerId: id });
});

export default router;
