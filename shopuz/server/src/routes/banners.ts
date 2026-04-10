import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { bannersTable } from "../schema.js";

const router = Router();

router.get("/banners", async (_req, res): Promise<void> => {
  const banners = await db.select().from(bannersTable).where(eq(bannersTable.isActive, true));
  res.json(banners);
});

router.get("/admin/banners", async (_req, res): Promise<void> => {
  const banners = await db.select().from(bannersTable);
  res.json(banners);
});

router.post("/banners", async (req, res): Promise<void> => {
  const { imageUrl, title, link, isActive, sortOrder } = req.body;
  if (!imageUrl) { res.status(400).json({ error: "imageUrl required" }); return; }
  const [banner] = await db.insert(bannersTable).values({ imageUrl, title: title ?? null, link: link ?? null, isActive: isActive !== false, sortOrder: sortOrder ?? 0 }).returning();
  res.status(201).json(banner);
});

router.patch("/banners/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { imageUrl, title, link, isActive, sortOrder } = req.body;
  const updates: any = {};
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (title !== undefined) updates.title = title;
  if (link !== undefined) updates.link = link;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const [banner] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id)).returning();
  if (!banner) { res.status(404).json({ error: "Not found" }); return; }
  res.json(banner);
});

router.delete("/banners/:id", async (req, res): Promise<void> => {
  await db.delete(bannersTable).where(eq(bannersTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});

export default router;
