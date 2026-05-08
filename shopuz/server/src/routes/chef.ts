import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db.js";
import { settingsTable, ordersTable, messagesTable } from "../schema.js";

const router = Router();

async function getSetting(key: string, def = ""): Promise<string> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? def;
}

router.post("/chef/login", async (req, res): Promise<void> => {
  const { password } = req.body;
  const chefPass = await getSetting("chefPassword", "chef123");
  if (!password || password !== chefPass) {
    res.status(401).json({ error: "Parol noto'g'ri" });
    return;
  }
  res.json({ success: true, role: "chef" });
});

router.get("/chef/orders", async (req, res): Promise<void> => {
  const token = req.headers["x-chef-token"];
  if (token !== "chef-authenticated") { res.status(401).json({ error: "Unauthorized" }); return; }
  const orders = await db.select().from(ordersTable)
    .where(inArray(ordersTable.status, ["new", "preparing"] as any));
  res.json(orders);
});

router.patch("/chef/orders/:id/status", async (req, res): Promise<void> => {
  const token = req.headers["x-chef-token"];
  if (token !== "chef-authenticated") { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!["preparing", "delivered", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  res.json(order);
});

router.get("/chef/messages", async (req, res): Promise<void> => {
  const token = req.headers["x-chef-token"];
  if (token !== "chef-authenticated") { res.status(401).json({ error: "Unauthorized" }); return; }
  const msgs = await db.select().from(messagesTable).orderBy(messagesTable.id);
  res.json(msgs);
});

export default router;
