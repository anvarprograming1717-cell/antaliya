import { Router } from "express";
import { eq, like, and, sql } from "drizzle-orm";
import { db } from "../db.js";
import { productsTable, categoriesTable, likedTable } from "../schema.js";

const router = Router();

router.get("/products", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string || "1");
  const limit = parseInt(req.query.limit as string || "20");
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(like(productsTable.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [products, countResult] = await Promise.all([
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
      createdAt: productsTable.createdAt,
    })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(where)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(productsTable).where(where),
  ]);

  let likedIds: Set<number> = new Set();
  if (customerId) {
    const liked = await db.select({ productId: likedTable.productId }).from(likedTable).where(eq(likedTable.customerId, customerId));
    likedIds = new Set(liked.map(l => l.productId));
  }

  res.json({
    products: products.map(p => ({
      ...p,
      images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
      isLiked: likedIds.has(p.id),
    })),
    total: Number(countResult[0].count),
    page,
    limit,
  });
});

router.post("/products", async (req, res): Promise<void> => {
  const { name, description, price, oldPrice, images, categoryId, inStock, unit } = req.body;
  if (!name || price === undefined) { res.status(400).json({ error: "name and price required" }); return; }
  const result = await db.insert(productsTable).values({
    name,
    description: description ?? null,
    price,
    oldPrice: oldPrice ?? null,
    images: JSON.stringify(images ?? []),
    categoryId: categoryId ?? null,
    inStock: inStock !== false,
    unit: unit ?? "dona",
  });
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, result[0].insertId)).limit(1);
  res.status(201).json({ ...product, images: JSON.parse(product.images as string), isLiked: false });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
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
    createdAt: productsTable.createdAt,
  })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id));

  if (!product) { res.status(404).json({ error: "Not found" }); return; }

  let isLiked = false;
  if (customerId) {
    const liked = await db.select().from(likedTable).where(and(eq(likedTable.customerId, customerId), eq(likedTable.productId, id)));
    isLiked = liked.length > 0;
  }
  res.json({ ...product, images: typeof product.images === "string" ? JSON.parse(product.images) : product.images, isLiked });
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const updates: any = {};
  const { name, description, price, oldPrice, images, categoryId, inStock, unit } = req.body;
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = price;
  if (oldPrice !== undefined) updates.oldPrice = oldPrice;
  if (images !== undefined) updates.images = JSON.stringify(images);
  if (categoryId !== undefined) updates.categoryId = categoryId;
  if (inStock !== undefined) updates.inStock = inStock;
  if (unit !== undefined) updates.unit = unit;
  await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...product, images: typeof product.images === "string" ? JSON.parse(product.images) : product.images });
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  await db.delete(productsTable).where(eq(productsTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});

export default router;
