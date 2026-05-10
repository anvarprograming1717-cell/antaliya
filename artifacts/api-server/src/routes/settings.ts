import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { UpdateAdminPasswordBody, AdminLoginBody } from "@workspace/api-zod";
import { getBotToken } from "../telegram.js";

const router: IRouter = Router();

async function upsertSetting(key: string, value: string) {
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing.length > 0) {
    await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

async function getAllMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

router.get("/support-contact", async (req, res): Promise<void> => {
  const map = await getAllMap();
  res.json({ phone: map.supportPhone ?? "+998901234567", telegram: map.supportTelegram ?? null });
});

router.patch("/admin/support-contact", async (req, res): Promise<void> => {
  const { phone, telegram } = req.body;
  if (phone) await upsertSetting("supportPhone", phone);
  if (telegram !== undefined) await upsertSetting("supportTelegram", telegram ?? "");
  const map = await getAllMap();
  res.json({ phone: map.supportPhone ?? "+998901234567", telegram: map.supportTelegram ?? null });
});

router.patch("/admin/password", async (req, res): Promise<void> => {
  const parsed = UpdateAdminPasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const map = await getAllMap();
  const currentPassword = map.adminPassword ?? "admin123";
  if (parsed.data.currentPassword !== currentPassword) { res.status(400).json({ error: "Current password incorrect" }); return; }
  await upsertSetting("adminPassword", parsed.data.newPassword);
  res.json({ success: true });
});

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const map = await getAllMap();
  const adminPassword = map.adminPassword ?? "admin123";
  if (parsed.data.password !== adminPassword) { res.status(401).json({ error: "Invalid password" }); return; }
  res.json({ success: true });
});

router.post("/admin/logout", async (req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/site-settings", async (req, res): Promise<void> => {
  const map = await getAllMap();
  res.json({
    siteName: map.siteName ?? null,
    logoUrl: map.logoUrl ?? null,
    loginTitle: map.loginTitle ?? null,
    loginSubtitle: map.loginSubtitle ?? null,
  });
});

router.patch("/admin/site-settings", async (req, res): Promise<void> => {
  const { siteName, logoUrl, loginTitle, loginSubtitle } = req.body;
  if (siteName !== undefined) await upsertSetting("siteName", siteName ?? "");
  if (logoUrl !== undefined) await upsertSetting("logoUrl", logoUrl ?? "");
  if (loginTitle !== undefined) await upsertSetting("loginTitle", loginTitle ?? "");
  if (loginSubtitle !== undefined) await upsertSetting("loginSubtitle", loginSubtitle ?? "");
  const map = await getAllMap();
  res.json({
    siteName: map.siteName ?? null,
    logoUrl: map.logoUrl ?? null,
    loginTitle: map.loginTitle ?? null,
    loginSubtitle: map.loginSubtitle ?? null,
  });
});

router.patch("/admin/chef-password", async (req, res): Promise<void> => {
  const { password } = req.body;
  if (!password || password.length < 4) { res.status(400).json({ error: "Password too short" }); return; }
  await upsertSetting("chefPassword", password);
  res.json({ success: true });
});

router.get("/admin/delivery-zone", async (req, res): Promise<void> => {
  const map = await getAllMap();
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
  const map = await getAllMap();
  if (!map.deliveryZoneLat) { res.json({ lat: null, lng: null, radiusKm: null }); return; }
  res.json({ lat: parseFloat(map.deliveryZoneLat), lng: parseFloat(map.deliveryZoneLng), radiusKm: parseFloat(map.deliveryZoneRadius ?? "5") });
});

// ── Work schedule ─────────────────────────────────────────────────────────────
router.get("/admin/work-schedule", async (req, res): Promise<void> => {
  const map = await getAllMap();
  let workDays = [1, 2, 3, 4, 5, 6];
  if (map.workDays) { try { workDays = JSON.parse(map.workDays); } catch {} }
  const workStart = map.workStart ?? "09:00";
  const workEnd = map.workEnd ?? "22:00";
  const timezone = map.timezone ?? "Asia/Tashkent";
  const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  const currentTime = `${String(nowLocal.getHours()).padStart(2, "0")}:${String(nowLocal.getMinutes()).padStart(2, "0")}`;
  res.json({ workDays, workStart, workEnd, timezone, currentTime });
});

router.patch("/admin/work-schedule", async (req, res): Promise<void> => {
  const { workDays, workStart, workEnd, timezone } = req.body;
  if (!Array.isArray(workDays)) { res.status(400).json({ error: "workDays must be array" }); return; }
  await upsertSetting("workDays", JSON.stringify(workDays));
  if (workStart) await upsertSetting("workStart", workStart);
  if (workEnd) await upsertSetting("workEnd", workEnd);
  if (timezone) await upsertSetting("timezone", timezone);
  const map = await getAllMap();
  const tz = map.timezone ?? "Asia/Tashkent";
  const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const currentTime = `${String(nowLocal.getHours()).padStart(2, "0")}:${String(nowLocal.getMinutes()).padStart(2, "0")}`;
  res.json({ workDays, workStart: map.workStart ?? "09:00", workEnd: map.workEnd ?? "22:00", timezone: tz, currentTime });
});

router.get("/work-schedule", async (req, res): Promise<void> => {
  const map = await getAllMap();
  let workDays = [1, 2, 3, 4, 5, 6];
  if (map.workDays) { try { workDays = JSON.parse(map.workDays); } catch {} }
  const workStart = map.workStart ?? "09:00";
  const workEnd = map.workEnd ?? "22:00";
  const timezone = map.timezone ?? "Asia/Tashkent";

  // Use configured timezone for correct local time
  const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  const todayDay = nowLocal.getDay();
  const isDayOpen = workDays.includes(todayDay);

  const [startH, startM] = workStart.split(":").map(Number);
  const [endH, endM] = workEnd.split(":").map(Number);
  const currentMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const isTimeOpen = currentMinutes >= startMinutes && currentMinutes < endMinutes;

  const isOpen = isDayOpen && isTimeOpen;

  // Determine closed reason for better UX messages
  let closedReason: "dayOff" | "afterHours" | "beforeHours" | null = null;
  if (!isOpen) {
    if (!isDayOpen) closedReason = "dayOff";
    else if (currentMinutes < startMinutes) closedReason = "beforeHours";
    else closedReason = "afterHours";
  }

  const dayNames = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  let nextWorkDay = "";
  if (!isOpen) {
    if (closedReason === "beforeHours") {
      nextWorkDay = `Bugun ${workStart} da ochiladi`;
    } else if (closedReason === "afterHours") {
      // Check if there's still work today (it's past closing) — tomorrow or next day
      for (let i = 1; i <= 7; i++) {
        const nd = (todayDay + i) % 7;
        if (workDays.includes(nd)) { nextWorkDay = `${dayNames[nd]} ${workStart} da`; break; }
      }
    } else {
      for (let i = 1; i <= 7; i++) {
        const nd = (todayDay + i) % 7;
        if (workDays.includes(nd)) { nextWorkDay = `${dayNames[nd]} ${workStart} da`; break; }
      }
    }
  }

  res.json({ isOpen, closedReason, nextWorkDay, workDays, workStart, workEnd });
});

// ── Telegram roles ────────────────────────────────────────────────────────────
router.get("/admin/telegram-admins", async (req, res): Promise<void> => {
  const map = await getAllMap();
  let adminIds: string[] = [];
  if (map.telegramAdminIds) { try { adminIds = JSON.parse(map.telegramAdminIds); } catch {} }
  res.json({ adminIds });
});

router.patch("/admin/telegram-admins", async (req, res): Promise<void> => {
  const { adminIds } = req.body;
  if (!Array.isArray(adminIds)) { res.status(400).json({ error: "adminIds must be array" }); return; }
  await upsertSetting("telegramAdminIds", JSON.stringify(adminIds.map(String)));
  res.json({ adminIds });
});

router.get("/admin/telegram-chefs", async (req, res): Promise<void> => {
  const map = await getAllMap();
  let chefIds: string[] = [];
  if (map.telegramChefIds) { try { chefIds = JSON.parse(map.telegramChefIds); } catch {} }
  res.json({ chefIds });
});

router.patch("/admin/telegram-chefs", async (req, res): Promise<void> => {
  const { chefIds } = req.body;
  if (!Array.isArray(chefIds)) { res.status(400).json({ error: "chefIds must be array" }); return; }
  await upsertSetting("telegramChefIds", JSON.stringify(chefIds.map(String)));
  res.json({ chefIds });
});

router.get("/admin/telegram-couriers", async (req, res): Promise<void> => {
  const map = await getAllMap();
  let courierIds: string[] = [];
  if (map.telegramCourierIds) { try { courierIds = JSON.parse(map.telegramCourierIds); } catch {} }
  res.json({ courierIds });
});

router.patch("/admin/telegram-couriers", async (req, res): Promise<void> => {
  const { courierIds } = req.body;
  if (!Array.isArray(courierIds)) { res.status(400).json({ error: "courierIds must be array" }); return; }
  await upsertSetting("telegramCourierIds", JSON.stringify(courierIds.map(String)));
  res.json({ courierIds });
});

// ── Bot settings ──────────────────────────────────────────────────────────────
router.get("/admin/bot-settings", async (req, res): Promise<void> => {
  const map = await getAllMap();
  res.json({
    botToken: map.telegramBotToken ?? "",
    siteUrl: map.botSiteUrl ?? "",
    deliveryUrl: map.botDeliveryUrl ?? "",
  });
});

router.patch("/admin/bot-settings", async (req, res): Promise<void> => {
  const { botToken, siteUrl, deliveryUrl } = req.body;
  if (botToken !== undefined) await upsertSetting("telegramBotToken", botToken ?? "");
  if (siteUrl !== undefined) await upsertSetting("botSiteUrl", siteUrl ?? "");
  if (deliveryUrl !== undefined) await upsertSetting("botDeliveryUrl", deliveryUrl ?? "");
  const map = await getAllMap();
  res.json({
    botToken: map.telegramBotToken ?? "",
    siteUrl: map.botSiteUrl ?? "",
    deliveryUrl: map.botDeliveryUrl ?? "",
  });
});

router.post("/admin/setup-webhook", async (req, res): Promise<void> => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) { res.status(400).json({ error: "webhookUrl required" }); return; }
  const token = await getBotToken();
  if (!token) { res.status(400).json({ error: "Bot token not configured" }); return; }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await r.json() as any;
    res.json({ success: data.ok, description: data.description });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
