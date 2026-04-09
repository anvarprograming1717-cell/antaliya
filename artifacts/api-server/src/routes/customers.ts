import { Router, type IRouter } from "express";
import { db, customersTable } from "@workspace/db";

const router: IRouter = Router();

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

router.get("/customers", async (req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(customersTable.createdAt);
  res.json(customers.map(serializeCustomer));
});

export default router;
