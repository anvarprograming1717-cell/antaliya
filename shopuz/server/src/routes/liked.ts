import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db.js";
import { likedTable, productsTable, categoriesTable } from "../schema.js";

const router = Router();

router.get("/liked", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.json([]); return; }
  const items = await db.select({
    id: likedTable.id,
    product: {
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      oldPrice: productsTable.oldPrice,
      images: productsTable.images,
      unit: productsTable.unit,
      inStock: productsTable.inStock,
      categoryName: categoriesTable.name,
    },
  })
    .from(likedTable)
    .innerJoin(productsTable, eq(likedTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(likedTable.customerId, customerId));
  res.json(items.map(i => ({
    ...i.product,
    images: typeof i.product.images === "string" ? JSON.parse(i.product.images) : (i.product.images ?? []),
    isLiked: true,
  })));
});

router.post("/liked", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { productId } = req.body;
  const existing = await db.select().from(likedTable)
    .where(and(eq(likedTable.customerId, customerId), eq(likedTable.productId, productId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(likedTable).where(and(eq(likedTable.customerId, customerId), eq(likedTable.productId, productId)));
    res.json({ success: true, isLiked: false });
  } else {
    await db.insert(likedTable).values({ customerId, productId });
    res.json({ success: true, isLiked: true });
  }
});

router.delete("/liked/:productId", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  await db.delete(likedTable).where(and(eq(likedTable.customerId, customerId), eq(likedTable.productId, parseInt(req.params.productId))));
  res.json({ success: true });
});

export default router;
