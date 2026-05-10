import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import { getBotToken } from "../telegram";

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

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));

  if (customer?.telegramId) {
    try {
      const token = await getBotToken();
      if (token) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: customer.telegramId,
            text: "❌ Sizning hisobingiz o'chirildi. Qayta foydalanish uchun ro'yxatdan o'ting.",
          }),
        });
      }
    } catch {}
  }

  await db.delete(customersTable).where(eq(customersTable.id, id));
  res.json({ success: true });
});

export default router;
