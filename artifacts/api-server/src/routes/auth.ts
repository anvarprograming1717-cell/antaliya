import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  SearchCustomerBody,
  LoginCustomerBody,
  UpdateMeBody,
} from "@workspace/api-zod";

function serializeCustomer(c: any) {
  return {
    id: c.id,
    phone: c.phone,
    name: c.name ?? null,
    avatarUrl: c.avatarUrl ?? null,
    language: c.language ?? null,
    telegramId: c.telegramId ?? null,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

const router: IRouter = Router();

router.post("/customers/search", async (req, res): Promise<void> => {
  const parsed = SearchCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const customer = await db.select().from(customersTable).where(eq(customersTable.phone, parsed.data.phone)).limit(1);
  if (customer.length === 0) {
    res.json({ exists: false, customer: null });
    return;
  }
  res.json({ exists: true, customer: serializeCustomer(customer[0]) });
});

router.post("/customers/login", async (req, res): Promise<void> => {
  const parsed = LoginCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(customersTable).where(eq(customersTable.phone, parsed.data.phone)).limit(1);
  let customer = existing[0];
  if (!customer) {
    const [created] = await db.insert(customersTable).values({
      phone: parsed.data.phone,
      name: parsed.data.name ?? null,
    }).returning();
    customer = created;
  } else if (parsed.data.name && !customer.name) {
    const [updated] = await db.update(customersTable)
      .set({ name: parsed.data.name })
      .where(eq(customersTable.id, customer.id))
      .returning();
    customer = updated;
  }
  res.json(serializeCustomer(customer));
});

router.get("/customers/me", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(serializeCustomer(customer));
});

router.patch("/customers/me", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db.update(customersTable)
    .set(parsed.data)
    .where(eq(customersTable.id, customerId))
    .returning();
  res.json(serializeCustomer(customer));
});

router.post("/customers/link-telegram", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { telegramId } = req.body;
  if (!telegramId) {
    res.status(400).json({ error: "telegramId required" });
    return;
  }
  const tid = String(telegramId);
  // Remove this telegramId from any other customer who currently has it
  await db.update(customersTable)
    .set({ telegramId: null })
    .where(eq(customersTable.telegramId, tid));
  // Link to current customer
  const [customer] = await db.update(customersTable)
    .set({ telegramId: tid })
    .where(eq(customersTable.id, customerId))
    .returning();
  res.json(serializeCustomer(customer));
});

router.post("/customers/logout", async (req, res): Promise<void> => {
  res.json({ success: true });
});

export default router;
