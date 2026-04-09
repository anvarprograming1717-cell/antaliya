import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bannersTable } from "@workspace/db";
import { CreateBannerBody, DeleteBannerParams, DeleteBannerResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/banners", async (req, res): Promise<void> => {
  const banners = await db.select().from(bannersTable).orderBy(bannersTable.sortOrder);
  res.json(banners);
});

router.post("/banners", async (req, res): Promise<void> => {
  const parsed = CreateBannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [banner] = await db.insert(bannersTable).values(parsed.data).returning();
  res.status(201).json(banner);
});

router.delete("/banners/:id", async (req, res): Promise<void> => {
  const params = DeleteBannerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(bannersTable).where(eq(bannersTable.id, params.data.id));
  res.json(DeleteBannerResponse.parse({ success: true }));
});

export default router;
