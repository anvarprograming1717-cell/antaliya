import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, likedTable, productsTable, categoriesTable } from "@workspace/db";
import { ToggleLikeBody, ToggleLikeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/liked", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.json([]);
    return;
  }
  const liked = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    description: productsTable.description,
    price: productsTable.price,
    oldPrice: productsTable.oldPrice,
    images: productsTable.images,
    categoryId: productsTable.categoryId,
    categoryName: categoriesTable.name,
    inStock: productsTable.inStock,
    createdAt: productsTable.createdAt,
  })
    .from(likedTable)
    .innerJoin(productsTable, eq(likedTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(likedTable.customerId, customerId));

  res.json(liked.map(p => ({
    ...p,
    price: parseFloat(p.price as string),
    oldPrice: p.oldPrice ? parseFloat(p.oldPrice as string) : null,
    isLiked: true,
  })));
});

router.post("/liked", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = ToggleLikeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(likedTable)
    .where(and(eq(likedTable.customerId, customerId), eq(likedTable.productId, parsed.data.productId)));

  if (existing.length > 0) {
    await db.delete(likedTable).where(eq(likedTable.id, existing[0].id));
    res.json(ToggleLikeResponse.parse({ liked: false }));
  } else {
    await db.insert(likedTable).values({ customerId, productId: parsed.data.productId });
    res.json(ToggleLikeResponse.parse({ liked: true }));
  }
});

export default router;
