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

// Delivery settings — includes estimatedMinutes
// Client hook uses /api/delivery (not /api/admin/delivery-settings)
async function getDeliverySettingsJson(db: any) {
  const all = await db.select().from(settingsTable);
  const m: Record<string, string> = {};
  all.forEach((s: any) => { m[s.key] = s.value; });
  return {
    deliveryFee: parseFloat(m.deliveryFee ?? "15000"),
    freeDeliveryThreshold: parseFloat(m.freeDeliveryThreshold ?? "300000"),
    estimatedMinutes: parseInt(m.estimatedMinutes ?? "45"),
  };
}

router.get("/delivery", async (_req, res): Promise<void> => {
  res.json(await getDeliverySettingsJson(db));
});

router.patch("/delivery", async (req, res): Promise<void> => {
  const { deliveryFee, freeDeliveryThreshold, estimatedMinutes } = req.body;
  if (deliveryFee !== undefined) await upsert("deliveryFee", String(deliveryFee));
  if (freeDeliveryThreshold !== undefined) await upsert("freeDeliveryThreshold", String(freeDeliveryThreshold));
  if (estimatedMinutes !== undefined) await upsert("estimatedMinutes", String(estimatedMinutes));
  res.json(await getDeliverySettingsJson(db));
});

router.get("/admin/delivery-settings", async (_req, res): Promise<void> => {
  res.json(await getDeliverySettingsJson(db));
});

router.patch("/admin/delivery-settings", async (req, res): Promise<void> => {
  const { deliveryFee, freeDeliveryThreshold, estimatedMinutes } = req.body;
  if (deliveryFee !== undefined) await upsert("deliveryFee", String(deliveryFee));
  if (freeDeliveryThreshold !== undefined) await upsert("freeDeliveryThreshold", String(freeDeliveryThreshold));
  if (estimatedMinutes !== undefined) await upsert("estimatedMinutes", String(estimatedMinutes));
  res.json(await getDeliverySettingsJson(db));
});

router.get("/admin/telegram-admins", async (_req, res): Promise<void> => {
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "telegram_admins")).limit(1);
  const ids = setting?.value ? setting.value.split(",").map(Number).filter(Boolean) : [214840221, 7157868450];
  res.json({ adminIds: ids });
});

router.patch("/admin/telegram-admins", async (req, res): Promise<void> => {
  const { adminIds } = req.body;
  if (!Array.isArray(adminIds)) { res.status(400).json({ error: "adminIds array required" }); return; }
  await upsert("telegram_admins", adminIds.join(","));
  res.json({ adminIds });
});

// Dam olish kunlari (ish kunlari)
// workDays: comma-separated JS day numbers. 0=Yak, 1=Du, 2=Se, 3=Ch, 4=Pa, 5=Ju, 6=Sha
// Default: 1,2,3,4,5,6 (Dush-Sha ishlaydi, Yak dam oladi)
router.get("/work-schedule", async (_req, res): Promise<void> => {
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "workDays")).limit(1);
  const workDays = setting?.value
    ? setting.value.split(",").map(Number).filter(n => !isNaN(n))
    : [1, 2, 3, 4, 5, 6];

  const now = new Date();
  const todayDay = now.getDay(); // 0=Sun, 1=Mon, ...
  const isOpen = workDays.includes(todayDay);

  // Keyingi ish kunini toping
  let nextWorkDay = "";
  if (!isOpen) {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (todayDay + i) % 7;
      if (workDays.includes(nextDay)) {
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + i);
        nextWorkDay = nextDate.toLocaleDateString("ru-RU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        break;
      }
    }
  }

  res.json({ isOpen, workDays, nextWorkDay });
});

router.get("/admin/work-schedule", async (_req, res): Promise<void> => {
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "workDays")).limit(1);
  const workDays = setting?.value
    ? setting.value.split(",").map(Number).filter((n: number) => !isNaN(n))
    : [1, 2, 3, 4, 5, 6];
  res.json({ workDays });
});

router.patch("/admin/work-schedule", async (req, res): Promise<void> => {
  const { workDays } = req.body;
  if (!Array.isArray(workDays)) { res.status(400).json({ error: "workDays array required" }); return; }
  await upsert("workDays", workDays.join(","));
  res.json({ workDays });
});

export default router;
