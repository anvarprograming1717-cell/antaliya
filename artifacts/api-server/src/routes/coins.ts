import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, customersTable, coinTransactionsTable, settingsTable } from "@workspace/db";

const router: IRouter = Router();

async function getCoinSettings() {
  const rows = await db.select().from(settingsTable);
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    coinEnabled: map.coinEnabled !== "false",
    coinRate: parseInt(map.coinRate ?? "1", 10),
    coinPer: parseInt(map.coinPer ?? "10000", 10),
    coinName: map.coinName ?? "Coin",
  };
}

router.get("/coins/settings", async (req, res): Promise<void> => {
  const settings = await getCoinSettings();
  res.json(settings);
});

router.get("/admin/coins/settings", async (req, res): Promise<void> => {
  const settings = await getCoinSettings();
  res.json(settings);
});

router.patch("/admin/coins/settings", async (req, res): Promise<void> => {
  const { coinEnabled, coinRate, coinPer, coinName } = req.body;
  async function upsert(key: string, value: string) {
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(settingsTable).set({ value, updatedAt: new Date() }).where(eq(settingsTable.key, key));
    } else {
      await db.insert(settingsTable).values({ key, value });
    }
  }
  if (coinEnabled !== undefined) await upsert("coinEnabled", String(coinEnabled));
  if (coinRate !== undefined) await upsert("coinRate", String(coinRate));
  if (coinPer !== undefined) await upsert("coinPer", String(coinPer));
  if (coinName !== undefined) await upsert("coinName", coinName);
  res.json(await getCoinSettings());
});

router.get("/coins/balance", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [customer] = await db.select({ coins: customersTable.coins }).from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
  const settings = await getCoinSettings();
  res.json({ coins: customer?.coins ?? 0, coinName: settings.coinName, coinEnabled: settings.coinEnabled });
});

router.get("/coins/transactions", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const txns = await db.select().from(coinTransactionsTable)
    .where(eq(coinTransactionsTable.customerId, customerId))
    .orderBy(desc(coinTransactionsTable.createdAt))
    .limit(20);
  res.json(txns.map(t => ({ ...t, createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt })));
});

router.patch("/admin/coins/adjust", async (req, res): Promise<void> => {
  const { customerId, amount, reason } = req.body;
  if (!customerId || !amount || !reason) { res.status(400).json({ error: "customerId, amount, reason required" }); return; }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  const newCoins = Math.max(0, (customer.coins ?? 0) + amount);
  await db.update(customersTable).set({ coins: newCoins }).where(eq(customersTable.id, customerId));
  await db.insert(coinTransactionsTable).values({ customerId, amount, reason });
  res.json({ coins: newCoins });
});

export { getCoinSettings };
export default router;
