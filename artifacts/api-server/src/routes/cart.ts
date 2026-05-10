import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, cartTable, productsTable, categoriesTable, likedTable } from "@workspace/db";
import {
  AddToCartBody,
  UpdateCartItemParams,
  UpdateCartItemBody,
  UpdateCartItemResponse,
  RemoveFromCartParams,
  RemoveFromCartResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getProductForCart(productId: number, customerId: number | null) {
  const [product] = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    description: productsTable.description,
    price: productsTable.price,
    oldPrice: productsTable.oldPrice,
    images: productsTable.images,
    categoryId: productsTable.categoryId,
    categoryName: categoriesTable.name,
    inStock: productsTable.inStock,
    unit: productsTable.unit,
    createdAt: productsTable.createdAt,
    coinProduct: productsTable.coinProduct,
    coinThreshold: productsTable.coinThreshold,
  })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, productId));

  if (!product) return null;

  let isLiked = false;
  if (customerId) {
    const liked = await db.select().from(likedTable)
      .where(and(eq(likedTable.customerId, customerId), eq(likedTable.productId, productId)));
    isLiked = liked.length > 0;
  }

  return {
    ...product,
    price: parseFloat(product.price as string),
    oldPrice: product.oldPrice ? parseFloat(product.oldPrice as string) : null,
    createdAt: (product.createdAt as Date).toISOString(),
    isLiked,
  };
}

router.get("/cart", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.json([]);
    return;
  }
  const items = await db.select().from(cartTable).where(eq(cartTable.customerId, customerId));
  const enriched = await Promise.all(items.map(async (item) => {
    const product = await getProductForCart(item.productId, customerId);
    return { ...item, product };
  }));
  res.json(enriched.filter(i => i.product));
});

router.post("/cart", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(cartTable)
    .where(and(eq(cartTable.customerId, customerId), eq(cartTable.productId, parsed.data.productId)));

  let cartItem;
  if (existing.length > 0) {
    const [updated] = await db.update(cartTable)
      .set({ quantity: existing[0].quantity + (parsed.data.quantity ?? 1) })
      .where(eq(cartTable.id, existing[0].id))
      .returning();
    cartItem = updated;
  } else {
    const [created] = await db.insert(cartTable).values({
      customerId,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity ?? 1,
    }).returning();
    cartItem = created;
  }

  const product = await getProductForCart(cartItem.productId, customerId);
  res.json({ ...cartItem, product });
});

router.patch("/cart/:id", async (req, res): Promise<void> => {
  const params = UpdateCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const customerId = (req as any).customerId;
  const [cartItem] = await db.update(cartTable)
    .set({ quantity: parsed.data.quantity })
    .where(eq(cartTable.id, params.data.id))
    .returning();
  if (!cartItem) {
    res.status(404).json({ error: "Cart item not found" });
    return;
  }
  const product = await getProductForCart(cartItem.productId, customerId);
  res.json({ ...cartItem, product });
});

router.delete("/cart/:id", async (req, res): Promise<void> => {
  const params = RemoveFromCartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(cartTable).where(eq(cartTable.id, params.data.id));
  res.json(RemoveFromCartResponse.parse({ success: true }));
});

export default router;
