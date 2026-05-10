import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable, likedTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  DeleteProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeProduct(p: any, isLiked = false) {
  return {
    ...p,
    price: parseFloat(p.price as string),
    oldPrice: p.oldPrice ? parseFloat(p.oldPrice as string) : null,
    coinProduct: p.coinProduct ?? false,
    coinThreshold: p.coinThreshold ?? 0,
    isLiked,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.parse(req.query);
  const customerId = (req as any).customerId;

  let conditions: any[] = [];
  const coinOnly = (req.query as any).coinOnly === "true";
  if (coinOnly) {
    conditions.push(eq(productsTable.coinProduct, true));
  } else {
    // Exclude coin products from the regular catalog
    conditions.push(eq(productsTable.coinProduct, false));
  }
  if (query.categoryId) {
    conditions.push(eq(productsTable.categoryId, query.categoryId));
  }
  if (query.search) {
    conditions.push(ilike(productsTable.name, `%${query.search}%`));
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const [products, [{ count }]] = await Promise.all([
    db.select({
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
      coinProduct: productsTable.coinProduct,
      coinThreshold: productsTable.coinThreshold,
      createdAt: productsTable.createdAt,
    })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(productsTable.createdAt),
    db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  let likedProductIds: Set<number> = new Set();
  if (customerId) {
    const liked = await db.select({ productId: likedTable.productId })
      .from(likedTable)
      .where(eq(likedTable.customerId, customerId));
    likedProductIds = new Set(liked.map(l => l.productId));
  }

  const enriched = products.map(p => serializeProduct(p, likedProductIds.has(p.id)));

  res.json({
    products: enriched,
    total: count,
    page,
    limit,
  });
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
    oldPrice: parsed.data.oldPrice != null ? String(parsed.data.oldPrice) : null,
    coinProduct: (parsed.data as any).coinProduct ?? false,
    coinThreshold: (parsed.data as any).coinThreshold ?? 0,
  }).returning();
  const category = product.categoryId
    ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)).limit(1)
    : [];
  res.status(201).json({
    ...serializeProduct(product),
    categoryName: category[0]?.name ?? null,
  });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const customerId = (req as any).customerId;
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
    coinProduct: productsTable.coinProduct,
    coinThreshold: productsTable.coinThreshold,
    createdAt: productsTable.createdAt,
  })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  let isLiked = false;
  if (customerId) {
    const liked = await db.select().from(likedTable)
      .where(and(eq(likedTable.customerId, customerId), eq(likedTable.productId, params.data.id)));
    isLiked = liked.length > 0;
  }

  res.json({
    ...serializeProduct(product, isLiked),
    createdAt: (product.createdAt as Date).toISOString(),
  });
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: any = { ...parsed.data };
  if (parsed.data.price != null) updateData.price = String(parsed.data.price);
  if (parsed.data.oldPrice != null) updateData.oldPrice = String(parsed.data.oldPrice);
  if (req.body.coinProduct !== undefined) updateData.coinProduct = req.body.coinProduct;
  if (req.body.coinThreshold !== undefined) updateData.coinThreshold = req.body.coinThreshold;

  const [product] = await db.update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const category = product.categoryId
    ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)).limit(1)
    : [];
  res.json({
    ...serializeProduct(product),
    createdAt: (product.createdAt as Date).toISOString(),
    categoryName: category[0]?.name ?? null,
  });
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.json(DeleteProductResponse.parse({ success: true }));
});

export default router;
