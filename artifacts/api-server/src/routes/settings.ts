import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { UpdateAdminPasswordBody, AdminLoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function upsertSetting(key: string, value: string) {
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing.length > 0) {
    await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

router.get("/support-contact", async (req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  res.json({ phone: map.supportPhone ?? "+998901234567", telegram: map.supportTelegram ?? null });
});

router.patch("/admin/support-contact", async (req, res): Promise<void> => {
  const { phone, telegram } = req.body;
  if (phone) await upsertSetting("supportPhone", phone);
  if (telegram !== undefined) await upsertSetting("supportTelegram", telegram ?? "");
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  res.json({ phone: map.supportPhone ?? "+998901234567", telegram: map.supportTelegram ?? null });
});

router.patch("/admin/password", async (req, res): Promise<void> => {
  const parsed = UpdateAdminPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  const currentPassword = map.adminPassword ?? "admin123";
  if (parsed.data.currentPassword !== currentPassword) {
    res.status(400).json({ error: "Current password incorrect" });
    return;
  }
  await upsertSetting("adminPassword", parsed.data.newPassword);
  res.json({ success: true });
});

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  const adminPassword = map.adminPassword ?? "admin123";
  if (parsed.data.password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ success: true });
});

router.post("/admin/logout", async (req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/site-settings", async (req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  res.json({ siteName: map.siteName ?? null, logoUrl: map.logoUrl ?? null });
});

router.patch("/admin/site-settings", async (req, res): Promise<void> => {
  const { siteName, logoUrl } = req.body;
  if (siteName !== undefined) await upsertSetting("siteName", siteName ?? "");
  if (logoUrl !== undefined) await upsertSetting("logoUrl", logoUrl ?? "");
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  res.json({ siteName: map.siteName ?? null, logoUrl: map.logoUrl ?? null });
});

// Chef password
router.patch("/admin/chef-password", async (req, res): Promise<void> => {
  const { password } = req.body;
  if (!password || password.length < 4) { res.status(400).json({ error: "Password too short" }); return; }
  await upsertSetting("chefPassword", password);
  res.json({ success: true });
});

// Delivery zone
router.get("/admin/delivery-zone", async (req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  if (!map.deliveryZoneLat) { res.json({ lat: null, lng: null, radiusKm: 5 }); return; }
  res.json({ lat: parseFloat(map.deliveryZoneLat), lng: parseFloat(map.deliveryZoneLng), radiusKm: parseFloat(map.deliveryZoneRadius ?? "5") });
});

router.patch("/admin/delivery-zone", async (req, res): Promise<void> => {
  const { lat, lng, radiusKm } = req.body;
  if (lat === undefined || lng === undefined) { res.status(400).json({ error: "lat and lng required" }); return; }
  await upsertSetting("deliveryZoneLat", String(lat));
  await upsertSetting("deliveryZoneLng", String(lng));
  await upsertSetting("deliveryZoneRadius", String(radiusKm ?? 5));
  res.json({ lat, lng, radiusKm: radiusKm ?? 5 });
});

router.get("/delivery-zone", async (req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  if (!map.deliveryZoneLat) { res.json({ lat: null, lng: null, radiusKm: null }); return; }
  res.json({ lat: parseFloat(map.deliveryZoneLat), lng: parseFloat(map.deliveryZoneLng), radiusKm: parseFloat(map.deliveryZoneRadius ?? "5") });
});

// ── Work schedule ─────────────────────────────────────────────────────────────
router.get("/admin/work-schedule", async (req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  const raw = map.workDays;
  let workDays = [1, 2, 3, 4, 5, 6];
  if (raw) { try { workDays = JSON.parse(raw); } catch {} }
  res.json({ workDays });
});

router.patch("/admin/work-schedule", async (req, res): Promise<void> => {
  const { workDays } = req.body;
  if (!Array.isArray(workDays)) { res.status(400).json({ error: "workDays must be array" }); return; }
  await upsertSetting("workDays", JSON.stringify(workDays));
  res.json({ workDays });
});

router.get("/work-schedule", async (req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  const raw = map.workDays;
  let workDays = [1, 2, 3, 4, 5, 6];
  if (raw) { try { workDays = JSON.parse(raw); } catch {} }
  res.json({ workDays });
});

// ── Telegram admins ───────────────────────────────────────────────────────────
router.get("/admin/telegram-admins", async (req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  const raw = map.telegramAdminIds;
  let adminIds: string[] = [];
  if (raw) { try { adminIds = JSON.parse(raw); } catch {} }
  res.json({ adminIds });
});

router.patch("/admin/telegram-admins", async (req, res): Promise<void> => {
  const { adminIds } = req.body;
  if (!Array.isArray(adminIds)) { res.status(400).json({ error: "adminIds must be array" }); return; }
  await upsertSetting("telegramAdminIds", JSON.stringify(adminIds.map(String)));
  res.json({ adminIds });
});

export default router;
