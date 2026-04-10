import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db.js";
import { cartTable, productsTable, categoriesTable } from "../schema.js";

const router = Router();

router.get("/cart", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.json([]); return; }
  const items = await db.select({
    id: cartTable.id,
    quantity: cartTable.quantity,
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
    .from(cartTable)
    .innerJoin(productsTable, eq(cartTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(cartTable.customerId, customerId));

  res.json(items.map(i => ({
    ...i,
    product: {
      ...i.product,
      images: typeof i.product.images === "string" ? JSON.parse(i.product.images) : i.product.images,
    },
  })));
});

router.post("/cart", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { productId, quantity = 1 } = req.body;
  if (!productId) { res.status(400).json({ error: "productId required" }); return; }

  const existing = await db.select().from(cartTable).where(and(eq(cartTable.customerId, customerId), eq(cartTable.productId, productId))).limit(1);
  if (existing.length > 0) {
    await db.update(cartTable).set({ quantity: existing[0].quantity + quantity }).where(eq(cartTable.id, existing[0].id));
  } else {
    await db.insert(cartTable).values({ customerId, productId, quantity });
  }
  res.json({ success: true });
});

router.patch("/cart/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    await db.delete(cartTable).where(eq(cartTable.id, id));
  } else {
    await db.update(cartTable).set({ quantity }).where(eq(cartTable.id, id));
  }
  res.json({ success: true });
});

router.delete("/cart/:id", async (req, res): Promise<void> => {
  await db.delete(cartTable).where(eq(cartTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});

router.delete("/cart", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (customerId) await db.delete(cartTable).where(eq(cartTable.customerId, customerId));
  res.json({ success: true });
});

export default router;
