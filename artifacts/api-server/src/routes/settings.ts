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

export default router;
