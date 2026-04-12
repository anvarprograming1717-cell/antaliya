import { Router } from "express";
import { db } from "../db.js";
import { ordersTable, orderItemsTable, customersTable, productsTable, couriersTable } from "../schema.js";
import { eq } from "drizzle-orm";

const router = Router();

async function enrichOrder(order: any) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
  return {
    ...order,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    items,
  };
}

// GET /api/stats/dashboard
router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable);
  const customers = await db.select().from(customersTable);

  const totalOrders = orders.length;
  const totalCustomers = customers.length;
  const totalRevenue = orders.filter(o => o.status === "delivered").reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);
  const newOrders = orders.filter(o => o.status === "new").length;
  const preparingOrders = orders.filter(o => o.status === "preparing").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => o.createdAt && new Date(o.createdAt) >= today).length;
  const todayRevenue = orders
    .filter(o => o.status === "delivered" && o.createdAt && new Date(o.createdAt) >= today)
    .reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);

  res.json({ totalOrders, totalCustomers, totalRevenue, newOrders, preparingOrders, deliveredOrders, todayOrders, todayRevenue });
});

// GET /api/stats/orders-by-status
router.get("/stats/orders-by-status", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable);
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }
  const result = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  res.json(result);
});

// GET /api/stats/recent-orders
router.get("/stats/recent-orders", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable);
  const recent = orders.reverse().slice(0, 10);
  const enriched = await Promise.all(recent.map(enrichOrder));
  res.json(enriched);
});

export default router;
