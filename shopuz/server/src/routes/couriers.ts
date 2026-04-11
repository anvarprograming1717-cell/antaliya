import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { couriersTable, ordersTable } from "../schema.js";

const router = Router();

function safe(c: any) {
  const { password, ...rest } = c;
  return rest;
}

router.get("/couriers", async (_req, res): Promise<void> => {
  const couriers = await db.select().from(couriersTable);
  res.json(couriers.map(safe));
});

router.post("/couriers", async (req, res): Promise<void> => {
  const { name, phone, username, password, isActive } = req.body;
  if (!name || !phone || !username || !password) { res.status(400).json({ error: "All fields required" }); return; }
  const [c] = await db.insert(couriersTable).values({ name, phone, username, password, isActive: isActive !== false }).returning();
  res.status(201).json(safe(c));
});

router.patch("/couriers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { name, phone, username, password, isActive } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (username !== undefined) updates.username = username;
  if (password !== undefined) updates.password = password;
  if (isActive !== undefined) updates.isActive = isActive;
  const [c] = await db.update(couriersTable).set(updates).where(eq(couriersTable.id, id)).returning();
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  res.json(safe(c));
});

router.delete("/couriers/:id", async (req, res): Promise<void> => {
  await db.delete(couriersTable).where(eq(couriersTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});

router.post("/courier/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  const [c] = await db.select().from(couriersTable).where(eq(couriersTable.username, username)).limit(1);
  if (!c || c.password !== password) { res.status(401).json({ error: "Invalid credentials" }); return; }
  if (!c.isActive) { res.status(403).json({ error: "Account disabled" }); return; }
  res.json({ id: c.id, name: c.name, phone: c.phone, username: c.username });
});

router.get("/courier/orders", async (req, res): Promise<void> => {
  const courierId = (req as any).courierId;
  if (!courierId) { res.json([]); return; }
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.courierId, courierId));
  res.json(orders);
});

router.patch("/courier/location", async (req, res): Promise<void> => {
  const courierId = (req as any).courierId;
  if (!courierId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { lat, lng } = req.body;
  await db.update(couriersTable).set({ lat, lng, locationUpdatedAt: new Date() }).where(eq(couriersTable.id, courierId));
  res.json({ success: true });
});

router.patch("/courier/status", async (req, res): Promise<void> => {
  const courierId = (req as any).courierId;
  if (!courierId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { isActive } = req.body;
  await db.update(couriersTable).set({ isActive }).where(eq(couriersTable.id, courierId));
  res.json({ success: true });
});

export default router;
