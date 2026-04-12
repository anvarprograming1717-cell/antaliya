import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db.js";
import { ordersTable, orderItemsTable, cartTable, productsTable, customersTable, settingsTable, couriersTable, promoCodesTable, promoCodeUsagesTable } from "../schema.js";
import { notifyAdmins, notifyCustomerOrderStatus } from "../services/telegram.js";

const router = Router();

async function enrichOrder(order: any) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
  let courierData: any = {};
  if (order.courierId) {
    const [courier] = await db.select().from(couriersTable).where(eq(couriersTable.id, order.courierId));
    if (courier) courierData = { name: courier.name, phone: courier.phone, lat: courier.lat, lng: courier.lng };
  }
  return {
    ...order,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    courierName: courierData.name ?? null,
    courierPhone: courierData.phone ?? null,
    courierLat: courierData.lat ?? null,
    courierLng: courierData.lng ?? null,
    items,
  };
}

// Mijoz o'z buyurtmalarini ko'radi
router.get("/orders", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  const conditions: any[] = [];
  if (req.query.status) conditions.push(eq(ordersTable.status, req.query.status as string));
  if (req.query.customerId) {
    conditions.push(eq(ordersTable.customerId, parseInt(req.query.customerId as string)));
  } else if (customerId) {
    conditions.push(eq(ordersTable.customerId, customerId));
  }
  const orders = await db.select().from(ordersTable).where(conditions.length ? and(...conditions) : undefined);
  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json(enriched);
});

// Admin barcha buyurtmalarni ko'radi (customer filteri yo'q)
router.get("/admin/orders", async (req, res): Promise<void> => {
  const conditions: any[] = [];
  if (req.query.status) conditions.push(eq(ordersTable.status, req.query.status as string));
  const orders = await db.select().from(ordersTable).where(conditions.length ? and(...conditions) : undefined);
  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json(enriched.reverse());
});

router.post("/orders", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { deliveryMethod, paymentMethod, address, note, promoCode: promoCodeInput } = req.body;
  if (!deliveryMethod || !paymentMethod) { res.status(400).json({ error: "deliveryMethod and paymentMethod required" }); return; }

  const cartItems = await db.select({ id: cartTable.id, productId: cartTable.productId, quantity: cartTable.quantity, product: productsTable })
    .from(cartTable)
    .innerJoin(productsTable, eq(cartTable.productId, productsTable.id))
    .where(eq(cartTable.customerId, customerId));

  if (cartItems.length === 0) { res.status(400).json({ error: "Cart is empty" }); return; }

  const allSettings = await db.select().from(settingsTable);
  const settingsMap: Record<string, string> = {};
  allSettings.forEach(s => { settingsMap[s.key] = s.value; });
  const fee = parseFloat(settingsMap.deliveryFee ?? "15000");
  const threshold = parseFloat(settingsMap.freeDeliveryThreshold ?? "300000");

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price as number) * item.quantity, 0);
  const deliveryFee = deliveryMethod === "delivery" && subtotal < threshold ? fee : 0;

  let discountAmount = 0;
  let appliedPromoCode: string | null = null;
  if (promoCodeInput) {
    const [promo] = await db.select().from(promoCodesTable).where(and(eq(promoCodesTable.code, promoCodeInput.toUpperCase()), eq(promoCodesTable.isActive, true))).limit(1);
    if (promo) {
      const alreadyUsed = await db.select().from(promoCodeUsagesTable).where(and(eq(promoCodeUsagesTable.promoCodeId, promo.id), eq(promoCodeUsagesTable.customerId, customerId))).limit(1);
      if (alreadyUsed.length === 0 && (!promo.maxUses || promo.usedCount < promo.maxUses)) {
        discountAmount = promo.discountType === "percent" ? subtotal * (promo.discountAmount as number) / 100 : (promo.discountAmount as number);
        appliedPromoCode = promo.code;
        await db.update(promoCodesTable).set({ usedCount: promo.usedCount + 1 }).where(eq(promoCodesTable.id, promo.id));
      }
    }
  }

  const totalPrice = Math.max(0, subtotal + deliveryFee - discountAmount);

  const result = await db.insert(ordersTable).values({
    customerId,
    status: "new",
    deliveryMethod,
    paymentMethod,
    address: address ?? null,
    note: note ?? null,
    promoCode: appliedPromoCode,
    discountAmount,
    totalPrice,
    deliveryFee,
  });
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, result[0].insertId)).limit(1);

  await db.insert(orderItemsTable).values(cartItems.map(item => ({
    orderId: order.id,
    productId: item.productId,
    productName: item.product.name,
    productImage: typeof item.product.images === "string"
      ? (JSON.parse(item.product.images)[0] ?? null)
      : ((item.product.images as any[])[0] ?? null),
    quantity: item.quantity,
    price: item.product.price as number,
  })));

  if (appliedPromoCode) {
    const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, appliedPromoCode)).limit(1);
    if (promo) await db.insert(promoCodeUsagesTable).values({ promoCodeId: promo.id, customerId, orderId: order.id });
  }

  await db.delete(cartTable).where(eq(cartTable.customerId, customerId));

  if (address) await db.update(customersTable).set({ savedAddress: address }).where(eq(customersTable.id, customerId));

  const enriched = await enrichOrder(order);

  const itemsList = cartItems.map(i => `• ${i.product.name} x${i.quantity}`).join("\n");
  const deliveryText = deliveryMethod === "delivery" ? "🚴 Yetkazib berish" : "🏪 Olib ketish";
  const paymentText = paymentMethod === "cash" ? "💵 Naqd" : paymentMethod === "card" ? "💳 Karta" : paymentMethod;
  notifyAdmins(
    `🛒 <b>Yangi buyurtma #${order.id}</b>\n\n` +
    `📦 Mahsulotlar:\n${itemsList}\n\n` +
    `💰 Jami: ${totalPrice.toLocaleString()} so'm\n` +
    `${deliveryText} | ${paymentText}\n` +
    (address ? `📍 Manzil: ${address}\n` : "") +
    (note ? `📝 Izoh: ${note}\n` : "") +
    `\n👉 Admin panelga kiring`
  ).catch(() => {});

  res.status(201).json(enriched);
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  notifyCustomerOrderStatus(order.customerId, order.id, status).catch(() => {});
  res.json(await enrichOrder(order));
});

router.patch("/orders/:id/assign-courier", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { courierId } = req.body;
  await db.update(ordersTable).set({ courierId: courierId ?? null }).where(eq(ordersTable.id, id));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichOrder(order));
});

// Mijoz o'z buyurtmasini o'chiradi
router.delete("/orders/:id/delete", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const customerId = (req as any).customerId;
  if (customerId) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order || order.customerId !== customerId) { res.status(403).json({ error: "Forbidden" }); return; }
  }
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

// Admin ixtiyoriy buyurtmani o'chiradi (customer tekshiruvisiz)
router.delete("/admin/orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

export default router;
