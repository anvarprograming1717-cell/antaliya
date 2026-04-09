import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, promoCodesTable, promoCodeUsagesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/promo-codes", async (req, res): Promise<void> => {
  const codes = await db.select().from(promoCodesTable).orderBy(promoCodesTable.createdAt);
  res.json(codes.map(c => ({
    ...c,
    discountAmount: parseFloat(c.discountAmount as string),
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  })));
});

router.post("/promo-codes", async (req, res): Promise<void> => {
  const { code, discountType, discountAmount, maxUses, isActive } = req.body;
  if (!code || !discountType || discountAmount == null) {
    res.status(400).json({ error: "code, discountType, discountAmount required" });
    return;
  }
  const upper = (code as string).toUpperCase().trim();
  const existing = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, upper)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Bu promokod allaqachon mavjud" });
    return;
  }
  const [created] = await db.insert(promoCodesTable).values({
    code: upper,
    discountType: discountType || "fixed",
    discountAmount: String(discountAmount),
    maxUses: maxUses ?? null,
    isActive: isActive !== false,
  }).returning();
  res.status(201).json({
    ...created,
    discountAmount: parseFloat(created.discountAmount as string),
    createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : created.createdAt,
  });
});

router.post("/promo-codes/apply", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  const { code, subtotal } = req.body;
  if (!code) {
    res.status(400).json({ error: "Promokod kiritilmadi" });
    return;
  }
  const upper = (code as string).toUpperCase().trim();
  const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, upper)).limit(1);
  if (!promo) {
    res.status(404).json({ error: "Promokod topilmadi" });
    return;
  }
  if (!promo.isActive) {
    res.status(400).json({ error: "Bu promokod faol emas" });
    return;
  }
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    res.status(400).json({ error: "Bu promokodning ishlatish limiti tugagan" });
    return;
  }
  if (customerId) {
    const usage = await db.select().from(promoCodeUsagesTable)
      .where(and(eq(promoCodeUsagesTable.promoCodeId, promo.id), eq(promoCodeUsagesTable.customerId, customerId)))
      .limit(1);
    if (usage.length > 0) {
      res.status(400).json({ error: "Siz bu promokodni avval ishlatgansiz" });
      return;
    }
  }
  const discount = parseFloat(promo.discountAmount as string);
  let discountAmount = 0;
  if (promo.discountType === "fixed") {
    discountAmount = discount;
  } else {
    discountAmount = ((subtotal || 0) * discount) / 100;
  }
  res.json({
    discountAmount,
    promoCode: promo.code,
    discountType: promo.discountType,
    discountPercent: promo.discountType === "percent" ? discount : null,
  });
});

router.patch("/promo-codes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { code, discountType, discountAmount, maxUses, isActive } = req.body;
  const updates: any = {};
  if (code !== undefined) updates.code = (code as string).toUpperCase().trim();
  if (discountType !== undefined) updates.discountType = discountType;
  if (discountAmount !== undefined) updates.discountAmount = String(discountAmount);
  if (maxUses !== undefined) updates.maxUses = maxUses;
  if (isActive !== undefined) updates.isActive = isActive;
  const [updated] = await db.update(promoCodesTable).set(updates).where(eq(promoCodesTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Promokod topilmadi" });
    return;
  }
  res.json({
    ...updated,
    discountAmount: parseFloat(updated.discountAmount as string),
    createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
  });
});

router.delete("/promo-codes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, id));
  res.json({ success: true });
});

export default router;
