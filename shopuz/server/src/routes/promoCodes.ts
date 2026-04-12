import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db.js";
import { promoCodesTable, promoCodeUsagesTable } from "../schema.js";

const router = Router();

router.get("/promo-codes", async (_req, res): Promise<void> => {
  const codes = await db.select().from(promoCodesTable);
  res.json(codes);
});

router.post("/promo-codes", async (req, res): Promise<void> => {
  const { code, discountType, discountAmount, maxUses, isActive } = req.body;
  if (!code || discountAmount === undefined) { res.status(400).json({ error: "code and discountAmount required" }); return; }
  const result = await db.insert(promoCodesTable).values({
    code: code.toUpperCase(),
    discountType: discountType ?? "fixed",
    discountAmount,
    maxUses: maxUses ?? null,
    isActive: isActive !== false,
  });
  const [pc] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.id, result[0].insertId)).limit(1);
  res.status(201).json(pc);
});

router.patch("/promo-codes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { code, discountType, discountAmount, maxUses, isActive } = req.body;
  const updates: any = {};
  if (code !== undefined) updates.code = code.toUpperCase();
  if (discountType !== undefined) updates.discountType = discountType;
  if (discountAmount !== undefined) updates.discountAmount = discountAmount;
  if (maxUses !== undefined) updates.maxUses = maxUses;
  if (isActive !== undefined) updates.isActive = isActive;
  await db.update(promoCodesTable).set(updates).where(eq(promoCodesTable.id, id));
  const [pc] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.id, id)).limit(1);
  if (!pc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(pc);
});

router.delete("/promo-codes/:id", async (req, res): Promise<void> => {
  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});

router.post("/promo-codes/apply", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { code, subtotal } = req.body;
  if (!code) { res.status(400).json({ error: "code required" }); return; }

  const [promo] = await db.select().from(promoCodesTable).where(and(eq(promoCodesTable.code, code.toUpperCase()), eq(promoCodesTable.isActive, true))).limit(1);
  if (!promo) { res.status(404).json({ error: "Promokod topilmadi" }); return; }
  if (promo.maxUses && promo.usedCount >= promo.maxUses) { res.status(400).json({ error: "Promokod limiti tugagan" }); return; }

  const alreadyUsed = await db.select().from(promoCodeUsagesTable).where(and(eq(promoCodeUsagesTable.promoCodeId, promo.id), eq(promoCodeUsagesTable.customerId, customerId))).limit(1);
  if (alreadyUsed.length > 0) { res.status(400).json({ error: "Bu promokodni allaqachon ishlatgansiz" }); return; }

  const discountAmount = promo.discountType === "percent" ? (subtotal || 0) * (promo.discountAmount as number) / 100 : promo.discountAmount as number;
  res.json({ code: promo.code, discountAmount, discountType: promo.discountType });
});

export default router;
