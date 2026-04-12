import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { categoriesTable } from "../schema.js";

const router = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable);
  res.json(cats);
});

router.post("/categories", async (req, res): Promise<void> => {
  const { name, imageUrl } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const result = await db.insert(categoriesTable).values({ name, imageUrl: imageUrl ?? null });
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, result[0].insertId)).limit(1);
  res.status(201).json(cat);
});

router.patch("/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { name, imageUrl } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id));
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cat);
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  await db.delete(categoriesTable).where(eq(categoriesTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});

export default router;
