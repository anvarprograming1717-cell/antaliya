import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, cartTable, productsTable, customersTable, settingsTable, couriersTable, promoCodesTable, promoCodeUsagesTable } from "@workspace/db";
import { sendTelegramToAdmins, sendTelegramToChefs, sendTelegramToCouriers, sendTelegramToCourier, sendTelegramToCustomer } from "../telegram.js";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichOrder(order: any) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const customer = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
  let courierData: { name?: string; phone?: string; lat?: number | null; lng?: number | null } = {};
  if (order.courierId) {
    const [courier] = await db.select().from(couriersTable).where(eq(couriersTable.id, order.courierId)).limit(1);
    if (courier) {
      courierData = {
        name: courier.name,
        phone: courier.phone,
        lat: courier.lat ? parseFloat(courier.lat as string) : null,
        lng: courier.lng ? parseFloat(courier.lng as string) : null,
      };
    }
  }
  return {
    ...order,
    totalPrice: parseFloat(order.totalPrice as string),
    deliveryFee: parseFloat(order.deliveryFee as string),
    discountAmount: parseFloat(order.discountAmount as string) || 0,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    customerName: customer[0]?.name ?? null,
    customerPhone: customer[0]?.phone ?? null,
    customerTelegramId: customer[0]?.telegramId ?? null,
    courierId: order.courierId ?? null,
    courierName: courierData.name ?? null,
    courierPhone: courierData.phone ?? null,
    courierLat: courierData.lat ?? null,
    courierLng: courierData.lng ?? null,
    promoCode: order.promoCode ?? null,
    items: items.map(i => ({
      ...i,
      price: parseFloat(i.price as string),
    })),
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const customerId = (req as any).customerId;

  let conditions: any[] = [];
  if (query.data.status) conditions.push(eq(ordersTable.status, query.data.status as any));
  if (query.data.customerId) {
    conditions.push(eq(ordersTable.customerId, query.data.customerId));
  } else if (customerId) {
    conditions.push(eq(ordersTable.customerId, customerId));
  }

  const orders = await db.select().from(ordersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(ordersTable.createdAt);

  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json(enriched);
});

router.post("/orders", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const cartItems = await db.select({
    id: cartTable.id,
    productId: cartTable.productId,
    quantity: cartTable.quantity,
    product: productsTable,
  })
    .from(cartTable)
    .innerJoin(productsTable, eq(cartTable.productId, productsTable.id))
    .where(eq(cartTable.customerId, customerId));

  if (cartItems.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const deliverySettings = await db.select().from(settingsTable);
  const feeStr = deliverySettings.find(s => s.key === "deliveryFee")?.value ?? "15000";
  const thresholdStr = deliverySettings.find(s => s.key === "freeDeliveryThreshold")?.value ?? "200000";

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.product.price as string) * item.quantity;
  }, 0);

  const deliveryFee = parsed.data.deliveryMethod === "delivery" && subtotal < parseFloat(thresholdStr)
    ? parseFloat(feeStr)
    : 0;

  let discountAmount = 0;
  let appliedPromoCode: string | null = null;
  if (parsed.data.promoCode) {
    const upper = parsed.data.promoCode.toUpperCase().trim();
    const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, upper)).limit(1);
    if (promo && promo.isActive) {
      const alreadyUsed = await db.select().from(promoCodeUsagesTable)
        .where(and(eq(promoCodeUsagesTable.promoCodeId, promo.id), eq(promoCodeUsagesTable.customerId, customerId)))
        .limit(1);
      const limitOk = promo.maxUses == null || promo.usedCount < promo.maxUses;
      if (alreadyUsed.length === 0 && limitOk) {
        const da = parseFloat(promo.discountAmount as string);
        discountAmount = promo.discountType === "fixed" ? da : (subtotal * da) / 100;
        appliedPromoCode = promo.code;
      }
    }
  }

  const totalPrice = Math.max(0, subtotal + deliveryFee - discountAmount);

  const [order] = await db.insert(ordersTable).values({
    customerId,
    status: "new",
    deliveryMethod: parsed.data.deliveryMethod,
    paymentMethod: parsed.data.paymentMethod,
    address: parsed.data.address ?? null,
    note: parsed.data.note ?? null,
    promoCode: appliedPromoCode,
    discountAmount: String(discountAmount),
    totalPrice: String(totalPrice),
    deliveryFee: String(deliveryFee),
  }).returning();

  await db.insert(orderItemsTable).values(cartItems.map(item => ({
    orderId: order.id,
    productId: item.productId,
    productName: item.product.name,
    productImage: item.product.images?.[0] ?? null,
    quantity: item.quantity,
    price: item.product.price,
  })));

  if (appliedPromoCode) {
    const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, appliedPromoCode)).limit(1);
    if (promo) {
      await db.insert(promoCodeUsagesTable).values({ promoCodeId: promo.id, customerId, orderId: order.id });
      await db.update(promoCodesTable).set({ usedCount: promo.usedCount + 1 }).where(eq(promoCodesTable.id, promo.id));
    }
  }

  if (parsed.data.address && parsed.data.deliveryMethod === "delivery") {
    await db.update(customersTable).set({ savedAddress: parsed.data.address }).where(eq(customersTable.id, customerId));
  }

  await db.delete(cartTable).where(eq(cartTable.customerId, customerId));

  const enriched = await enrichOrder(order);

  const customer = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
  const customerName = customer[0]?.name ?? "Noma'lum";
  const customerPhone = customer[0]?.phone ?? "";
  const customerTelegramId = customer[0]?.telegramId ?? null;
  const deliveryLabel = parsed.data.deliveryMethod === "delivery" ? "Yetkazib berish" : "Olib ketish";
  const paymentLabel = parsed.data.paymentMethod === "cash" ? "Naqd" : parsed.data.paymentMethod === "card" ? "Karta" : parsed.data.paymentMethod;
  const itemLines = enriched.items.map((i: any) => `  • ${i.productName} × ${i.quantity}`).join("\n");
  const tgText = `🛒 <b>Yangi buyurtma #${order.id}</b>\n👤 ${customerName} (${customerPhone})\n💰 ${enriched.totalPrice.toLocaleString()} so'm\n🚚 ${deliveryLabel} | 💳 ${paymentLabel}${parsed.data.address ? `\n📍 ${parsed.data.address}` : ""}${parsed.data.note ? `\n📝 ${parsed.data.note}` : ""}\n\n${itemLines}`;
  sendTelegramToAdmins(tgText).catch(() => {});
  sendTelegramToChefs(tgText).catch(() => {});

  // Notify customer that order was placed
  if (customerTelegramId) {
    const customerText = `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n📦 Buyurtma #${order.id}\n💰 ${enriched.totalPrice.toLocaleString()} so'm\n🚚 ${deliveryLabel} | 💳 ${paymentLabel}${parsed.data.address ? `\n📍 ${parsed.data.address}` : ""}\n\n${itemLines}\n\nHodimlarimiz tez orada buyurtmangizni tayyorlashni boshlaydi.`;
    sendTelegramToCustomer(customerTelegramId, customerText).catch(() => {});
  }

  res.status(201).json(enriched);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const enriched = await enrichOrder(order);
  res.json(enriched);
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const enriched = await enrichOrder(order);

  const customerTelegramId = enriched.customerTelegramId as string | null;
  const statusMessages: Record<string, string> = {
    preparing: `🍳 <b>Buyurtma #${order.id} tayyorlanmoqda</b>\n\nSizning buyurtmangiz qabul qilindi va tayyorlanmoqda. Iltimos kuting!`,
    ready: `✅ <b>Buyurtma #${order.id} tayyor!</b>\n\nSizning buyurtmangiz tayyor. Tez orada yetkazib beriladi!`,
    delivering: `🚚 <b>Buyurtma #${order.id} yetkazilmoqda</b>\n\nKuryer yo'lda! Tez orada yetib keladi.`,
    delivered: `🎉 <b>Buyurtma #${order.id} yetkazildi!</b>\n\nBuyurtmangizni qabul qildingizmi? Xarid uchun rahmat!`,
    cancelled: `❌ <b>Buyurtma #${order.id} bekor qilindi</b>\n\nAfsuski, buyurtmangiz bekor qilindi.`,
  };

  if (customerTelegramId && statusMessages[parsed.data.status]) {
    sendTelegramToCustomer(customerTelegramId, statusMessages[parsed.data.status]).catch(() => {});
  }

  if (parsed.data.status === "ready") {
    const courierText = `📦 <b>Buyurtma #${order.id} tayyor!</b>\n👤 ${enriched.customerName ?? "Noma'lum"} (${enriched.customerPhone ?? ""})\n📍 ${enriched.address ?? "Olib ketish"}\n💰 ${enriched.totalPrice.toLocaleString()} so'm\n\nBuyurtmani olib ketish vaqti!`;
    sendTelegramToCouriers(courierText).catch(() => {});
  }

  res.json(enriched);
});

router.delete("/orders/:id/delete", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const customerId = (req as any).customerId;
  const isAdmin = (req as any).isAdmin;
  if (!customerId && !isAdmin) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (customerId && !isAdmin) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order || order.customerId !== customerId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

router.get("/admin/orders", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  let conditions: any[] = [];
  if (status) conditions.push(eq(ordersTable.status, status as any));
  const orders = await db.select().from(ordersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(ordersTable.createdAt);
  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json(enriched);
});

router.delete("/admin/orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

router.patch("/orders/:id/assign-courier", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { courierId } = req.body;
  const [order] = await db.update(ordersTable)
    .set({ courierId: courierId ?? null })
    .where(eq(ordersTable.id, id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const enriched = await enrichOrder(order);

  // Notify the specific courier via Telegram if they have a telegramId
  if (courierId) {
    const [courier] = await db.select().from(couriersTable).where(eq(couriersTable.id, courierId)).limit(1);
    if (courier?.telegramId) {
      const deliveryLabel = order.address ? `📍 ${order.address}` : "Olib ketish";
      const msg = `🚚 <b>Yangi buyurtma sizga tayinlandi!</b>\n\n📦 Buyurtma #${order.id}\n${deliveryLabel}\n💰 ${enriched.totalPrice.toLocaleString()} so'm\n\nBuyurtmani olib ketish vaqti!`;
      sendTelegramToCourier(courier.telegramId, msg).catch(() => {});
    }
  }

  res.json(enriched);
});

export default router;
