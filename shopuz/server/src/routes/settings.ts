import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { settingsTable } from "../schema.js";

const router = Router();

async function upsert(key: string, value: string) {
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  if (existing) {
    await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

router.get("/site-settings", async (_req, res): Promise<void> => {
  const all = await db.select().from(settingsTable);
  const m: Record<string, string> = {};
  all.forEach(s => { m[s.key] = s.value; });
  res.json({ siteName: m.siteName ?? null, logoUrl: m.logoUrl ?? null });
});

router.patch("/admin/site-settings", async (req, res): Promise<void> => {
  const { siteName, logoUrl } = req.body;
  if (siteName !== undefined) await upsert("siteName", siteName ?? "");
  if (logoUrl !== undefined) await upsert("logoUrl", logoUrl ?? "");
  const all = await db.select().from(settingsTable);
  const m: Record<string, string> = {};
  all.forEach(s => { m[s.key] = s.value; });
  res.json({ siteName: m.siteName ?? null, logoUrl: m.logoUrl ?? null });
});

router.get("/support-contact", async (_req, res): Promise<void> => {
  const all = await db.select().from(settingsTable);
  const m: Record<string, string> = {};
  all.forEach(s => { m[s.key] = s.value; });
  res.json({ phone: m.supportPhone ?? null, telegram: m.supportTelegram ?? null });
});

router.patch("/admin/support-contact", async (req, res): Promise<void> => {
  const { phone, telegram } = req.body;
  if (phone !== undefined) await upsert("supportPhone", phone ?? "");
  if (telegram !== undefined) await upsert("supportTelegram", telegram ?? "");
  const all = await db.select().from(settingsTable);
  const m: Record<string, string> = {};
  all.forEach(s => { m[s.key] = s.value; });
  res.json({ phone: m.supportPhone ?? null, telegram: m.supportTelegram ?? null });
});

router.post("/admin/login", async (req, res): Promise<void> => {
  const { password } = req.body;
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "adminPassword")).limit(1);
  const adminPass = setting?.value ?? "admin123";
  if (password !== adminPass) { res.status(401).json({ error: "Invalid password" }); return; }
  res.json({ success: true });
});

router.post("/admin/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

router.patch("/admin/password", async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "adminPassword")).limit(1);
  const adminPass = setting?.value ?? "admin123";
  if (currentPassword !== adminPass) { res.status(400).json({ error: "Wrong current password" }); return; }
  await upsert("adminPassword", newPassword);
  res.json({ success: true });
});

router.get("/admin/delivery-settings", async (_req, res): Promise<void> => {
  const all = await db.select().from(settingsTable);
  const m: Record<string, string> = {};
  all.forEach(s => { m[s.key] = s.value; });
  res.json({ deliveryFee: parseFloat(m.deliveryFee ?? "15000"), freeDeliveryThreshold: parseFloat(m.freeDeliveryThreshold ?? "300000") });
});

router.patch("/admin/delivery-settings", async (req, res): Promise<void> => {
  const { deliveryFee, freeDeliveryThreshold } = req.body;
  if (deliveryFee !== undefined) await upsert("deliveryFee", String(deliveryFee));
  if (freeDeliveryThreshold !== undefined) await upsert("freeDeliveryThreshold", String(freeDeliveryThreshold));
  const all = await db.select().from(settingsTable);
  const m: Record<string, string> = {};
  all.forEach(s => { m[s.key] = s.value; });
  res.json({ deliveryFee: parseFloat(m.deliveryFee ?? "15000"), freeDeliveryThreshold: parseFloat(m.freeDeliveryThreshold ?? "300000") });
});

export default router;
