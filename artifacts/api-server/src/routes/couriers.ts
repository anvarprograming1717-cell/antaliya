import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, couriersTable, ordersTable } from "@workspace/db";

const router: IRouter = Router();

function serializeCourier(c: any) {
  return {
    ...c,
    lat: c.lat ? parseFloat(c.lat) : null,
    lng: c.lng ? parseFloat(c.lng) : null,
    locationUpdatedAt: c.locationUpdatedAt instanceof Date ? c.locationUpdatedAt.toISOString() : c.locationUpdatedAt,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    password: undefined,
  };
}

router.get("/couriers", async (_req, res): Promise<void> => {
  const couriers = await db.select().from(couriersTable).orderBy(couriersTable.createdAt);
  res.json(couriers.map(serializeCourier));
});

router.post("/couriers", async (req, res): Promise<void> => {
  const { name, phone, username, password, isActive, telegramId } = req.body;
  if (!name || !phone || !username || !password) {
    res.status(400).json({ error: "name, phone, username, password required" });
    return;
  }
  const existing = await db.select().from(couriersTable).where(eq(couriersTable.username, username)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }
  const [courier] = await db.insert(couriersTable).values({
    name,
    phone,
    username,
    password,
    isActive: isActive !== undefined ? isActive : true,
    telegramId: telegramId || null,
  }).returning();
  res.status(201).json(serializeCourier(courier));
});

router.patch("/couriers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { name, phone, username, password, isActive, telegramId } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (username !== undefined) updates.username = username;
  if (password !== undefined) updates.password = password;
  if (isActive !== undefined) updates.isActive = isActive;
  if (telegramId !== undefined) updates.telegramId = telegramId || null;
  const [updated] = await db.update(couriersTable).set(updates).where(eq(couriersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeCourier(updated));
});

router.delete("/couriers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(couriersTable).where(eq(couriersTable.id, id));
  res.json({ success: true });
});

router.post("/courier/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "username and password required" });
    return;
  }
  const [courier] = await db.select().from(couriersTable).where(eq(couriersTable.username, username)).limit(1);
  if (!courier || courier.password !== password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (!courier.isActive) {
    res.status(403).json({ error: "Account disabled" });
    return;
  }
  res.json({ id: courier.id, name: courier.name, phone: courier.phone, username: courier.username });
});

router.patch("/courier/location", async (req, res): Promise<void> => {
  const courierId = (req as any).courierId;
  if (!courierId) {
    res.status(401).json({ error: "Courier not authenticated" });
    return;
  }
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    res.status(400).json({ error: "lat and lng required" });
    return;
  }
  await db.update(couriersTable).set({
    lat: String(lat),
    lng: String(lng),
    locationUpdatedAt: new Date(),
  }).where(eq(couriersTable.id, courierId));
  res.json({ success: true });
});

router.get("/courier/orders", async (req, res): Promise<void> => {
  const courierId = (req as any).courierId;
  if (!courierId) {
    res.status(401).json({ error: "Courier not authenticated" });
    return;
  }
  // Show: "ready" orders (unassigned, for picking up) + own "delivering" orders
  const { or, isNull } = await import("drizzle-orm");
  const orders = await db.select().from(ordersTable)
    .where(
      or(
        // Ready orders with no courier assigned yet
        eq(ordersTable.status, "ready" as any),
        // Their own active delivering orders
        eq(ordersTable.courierId, courierId),
      )
    )
    .orderBy(ordersTable.createdAt);
  const enriched = orders.map((o: any) => ({
    ...o,
    totalPrice: parseFloat(o.totalPrice as string),
    deliveryFee: parseFloat(o.deliveryFee as string),
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    items: [],
  }));
  res.json(enriched);
});

// Courier accepts a ready order → becomes "delivering"
router.patch("/courier/orders/:id/accept", async (req, res): Promise<void> => {
  const courierId = (req as any).courierId;
  if (!courierId) { res.status(401).json({ error: "Courier not authenticated" }); return; }
  const id = parseInt(req.params.id, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "ready") { res.status(400).json({ error: "Order is not ready" }); return; }
  await db.update(ordersTable).set({ status: "delivering" as any, courierId }).where(eq(ordersTable.id, id));
  const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  res.json({ ...updated, totalPrice: parseFloat(updated.totalPrice as string), deliveryFee: parseFloat(updated.deliveryFee as string) });
});

// Courier marks order as delivered
router.patch("/courier/orders/:id/delivered", async (req, res): Promise<void> => {
  const courierId = (req as any).courierId;
  if (!courierId) { res.status(401).json({ error: "Courier not authenticated" }); return; }
  const id = parseInt(req.params.id, 10);
  await db.update(ordersTable).set({ status: "delivered" as any }).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

export default router;
