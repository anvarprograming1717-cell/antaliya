const LIKED_KEY = "shopuz_liked";

export type LikedProduct = {
  id: number;
  name: string;
  price: number;
  oldPrice?: number | null;
  images: string[];
  unit?: string;
  inStock?: boolean;
  categoryId?: number | null;
  categoryName?: string | null;
};

export function getLikedProducts(): LikedProduct[] {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isProductLiked(productId: number): boolean {
  return getLikedProducts().some(p => p.id === productId);
}

export function toggleLikedProduct(product: LikedProduct): boolean {
  const list = getLikedProducts();
  const idx = list.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    localStorage.setItem(LIKED_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("liked-changed"));
    return false;
  } else {
    list.push(product);
    localStorage.setItem(LIKED_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("liked-changed"));
    return true;
  }
}
