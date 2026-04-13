import { Router } from "express";
import { db } from "../db.js";
import { ordersTable, orderItemsTable, customersTable } from "../schema.js";
import { eq } from "drizzle-orm";

const router = Router();

async function enrichOrder(order: any) {
  try {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
    return {
      ...order,
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone ?? null,
      items,
    };
  } catch {
    return { ...order, customerName: null, customerPhone: null, items: [] };
  }
}

// GET /api/stats/dashboard
router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  try {
    const [orders, customers] = await Promise.all([
      db.select().from(ordersTable),
      db.select().from(customersTable),
    ]);

    const totalOrders = orders.length;
    const totalCustomers = customers.length;
    const totalRevenue = orders
      .filter(o => o.status === "delivered")
      .reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);
    const newOrders = orders.filter(o => o.status === "new").length;
    const preparingOrders = orders.filter(o => o.status === "preparing").length;
    const deliveredOrders = orders.filter(o => o.status === "delivered").length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt as any);
      return d >= today;
    }).length;
    const todayRevenue = orders
      .filter(o => {
        if (o.status !== "delivered" || !o.createdAt) return false;
        const d = new Date(o.createdAt as any);
        return d >= today;
      })
      .reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);

    res.json({
      totalOrders,
      totalCustomers,
      totalRevenue,
      newOrders,
      preparingOrders,
      deliveredOrders,
      todayOrders,
      todayRevenue,
    });
  } catch (err: any) {
    console.error("GET /stats/dashboard error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// GET /api/stats/orders-by-status
router.get("/stats/orders-by-status", async (_req, res): Promise<void> => {
  try {
    const orders = await db.select().from(ordersTable);
    const statusCounts: Record<string, number> = {};
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }
    const result = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
    res.json(result);
  } catch (err: any) {
    console.error("GET /stats/orders-by-status error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// GET /api/stats/recent-orders
router.get("/stats/recent-orders", async (_req, res): Promise<void> => {
  try {
    const orders = await db.select().from(ordersTable);
    const sorted = [...orders].sort((a, b) => {
      const da = new Date(a.createdAt as any).getTime();
      const db2 = new Date(b.createdAt as any).getTime();
      return db2 - da;
    });
    const recent = sorted.slice(0, 10);
    const enriched = await Promise.all(recent.map(enrichOrder));
    res.json(enriched);
  } catch (err: any) {
    console.error("GET /stats/recent-orders error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

export default router;
