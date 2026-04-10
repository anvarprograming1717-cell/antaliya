import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { customersTable } from "../schema.js";

const router = Router();

function serializeCustomer(c: any) {
  return {
    id: c.id,
    phone: c.phone,
    name: c.name ?? null,
    avatarUrl: c.avatarUrl ?? null,
    language: c.language ?? "uz",
    savedAddress: c.savedAddress ?? null,
    lastNotificationReadAt: c.lastNotificationReadAt ?? null,
    createdAt: c.createdAt,
  };
}

router.post("/customers/search", async (req, res): Promise<void> => {
  const { phone } = req.body;
  if (!phone) { res.status(400).json({ error: "phone required" }); return; }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
  if (!customer) { res.json({ exists: false, customer: null }); return; }
  res.json({ exists: true, customer: serializeCustomer(customer) });
});

router.post("/customers/login", async (req, res): Promise<void> => {
  const { phone, name } = req.body;
  if (!phone) { res.status(400).json({ error: "phone required" }); return; }
  const existing = await db.select().from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
  let customer = existing[0];
  if (!customer) {
    const [created] = await db.insert(customersTable).values({ phone, name: name ?? null }).returning();
    customer = created;
  } else if (name && !customer.name) {
    const [updated] = await db.update(customersTable).set({ name }).where(eq(customersTable.id, customer.id)).returning();
    customer = updated;
  }
  res.json(serializeCustomer(customer));
});

router.get("/customers/me", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeCustomer(customer));
});

router.patch("/customers/me", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { name, language } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (language !== undefined) updates.language = language;
  const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, customerId)).returning();
  res.json(serializeCustomer(customer));
});

router.post("/customers/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

export default router;
