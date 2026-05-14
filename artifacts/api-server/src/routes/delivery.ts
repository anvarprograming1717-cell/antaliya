import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { UpdateDeliverySettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getDeliverySettings() {
  const settings = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return {
    deliveryFee: parseFloat(map.deliveryFee ?? "15000"),
    freeDeliveryThreshold: parseFloat(map.freeDeliveryThreshold ?? "200000"),
    estimatedMinutes: parseInt(map.estimatedMinutes ?? "45"),
    deliveryServiceType: (map.deliveryServiceType ?? "courier") as "courier" | "taxi",
    taxiLink: map.taxiLink ?? "",
    taxiPhone: map.taxiPhone ?? "",
  };
}

async function upsertSetting(key: string, value: string) {
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing.length > 0) {
    await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

router.get("/delivery", async (req, res): Promise<void> => {
  const settings = await getDeliverySettings();
  res.json(settings);
});

router.patch("/delivery", async (req, res): Promise<void> => {
  const parsed = UpdateDeliverySettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.deliveryFee != null) await upsertSetting("deliveryFee", String(parsed.data.deliveryFee));
  if (parsed.data.freeDeliveryThreshold != null) await upsertSetting("freeDeliveryThreshold", String(parsed.data.freeDeliveryThreshold));
  if (parsed.data.estimatedMinutes != null) await upsertSetting("estimatedMinutes", String(parsed.data.estimatedMinutes));
  if (req.body.deliveryServiceType != null) await upsertSetting("deliveryServiceType", String(req.body.deliveryServiceType));
  if (req.body.taxiLink != null) await upsertSetting("taxiLink", String(req.body.taxiLink));
  if (req.body.taxiPhone != null) await upsertSetting("taxiPhone", String(req.body.taxiPhone));
  const settings = await getDeliverySettings();
  res.json(settings);
});

export default router;
