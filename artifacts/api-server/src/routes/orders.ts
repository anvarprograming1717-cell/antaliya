import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, cartTable, productsTable, customersTable, settingsTable } from "@workspace/db";
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
  return {
    ...order,
    totalPrice: parseFloat(order.totalPrice as string),
    deliveryFee: parseFloat(order.deliveryFee as string),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    customerName: customer[0]?.name ?? null,
    customerPhone: customer[0]?.phone ?? null,
    items: items.map(i => ({
      ...i,
      price: parseFloat(i.price as string),
      createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
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
  const totalPrice = subtotal + deliveryFee;

  const [order] = await db.insert(ordersTable).values({
    customerId,
    status: "new",
    deliveryMethod: parsed.data.deliveryMethod,
    paymentMethod: parsed.data.paymentMethod,
    address: parsed.data.address ?? null,
    note: parsed.data.note ?? null,
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

  await db.delete(cartTable).where(eq(cartTable.customerId, customerId));

  const enriched = await enrichOrder(order);
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
  res.json(enriched);
});

export default router;
