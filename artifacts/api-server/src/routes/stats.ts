import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, ordersTable, customersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/dashboard", async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [orders, customers, revenue, todayStats] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(customersTable),
    db.select({ total: sql<number>`sum(total_price::numeric)::float` }).from(ordersTable),
    db.select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`sum(total_price::numeric)::float`,
    }).from(ordersTable).where(sql`created_at >= ${today.toISOString()}`),
  ]);

  const byStatus = await db.select({
    status: ordersTable.status,
    count: sql<number>`count(*)::int`,
  }).from(ordersTable).groupBy(ordersTable.status);

  const statusMap: Record<string, number> = {};
  byStatus.forEach(s => { statusMap[s.status] = s.count; });

  res.json({
    totalOrders: orders[0].count,
    totalCustomers: customers[0].count,
    totalRevenue: revenue[0].total ?? 0,
    newOrders: statusMap.new ?? 0,
    preparingOrders: statusMap.preparing ?? 0,
    deliveredOrders: statusMap.delivered ?? 0,
    todayOrders: todayStats[0].count,
    todayRevenue: todayStats[0].revenue ?? 0,
  });
});

router.get("/stats/orders-by-status", async (req, res): Promise<void> => {
  const byStatus = await db.select({
    status: ordersTable.status,
    count: sql<number>`count(*)::int`,
  }).from(ordersTable).groupBy(ordersTable.status);
  res.json(byStatus);
});

router.get("/stats/recent-orders", async (req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable)
    .orderBy(sql`created_at desc`)
    .limit(10);
  
  const { orderItemsTable } = await import("@workspace/db");
  const enriched = await Promise.all(orders.map(async (order) => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const customer = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
    return {
      ...order,
      totalPrice: parseFloat(order.totalPrice as string),
      deliveryFee: parseFloat(order.deliveryFee as string),
      customerName: customer[0]?.name ?? null,
      customerPhone: customer[0]?.phone ?? null,
      items: items.map(i => ({
        ...i,
        price: parseFloat(i.price as string),
      })),
    };
  }));
  res.json(enriched);
});

export default router;
