import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, MessageCircle, ShoppingBag, ShoppingCart, Check, X, Coins } from "lucide-react";
import { 
  useListProducts, 
  getListProductsQueryKey,
  useListCategories,
  getListCategoriesQueryKey,
  useListBanners,
  getListBannersQueryKey,
  useGetSiteSettings,
  getGetSiteSettingsQueryKey,
  useAddToCart,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isProductLiked, toggleLikedProduct } from "@/lib/liked-local";
import { getCustomerSession } from "@/lib/auth";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [, setLikedVersion] = useState(0);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [restInfo, setRestInfo] = useState<{ isOpen: boolean; closedReason?: string; nextWorkDay: string } | null>(null);
  const [showRestModal, setShowRestModal] = useState(false);
  const queryClient = useQueryClient();
  const session = getCustomerSession();

  const { data: siteSettings } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });
  const siteName = siteSettings?.siteName || "ShopUz";
  const logoUrl = siteSettings?.logoUrl || null;

  const [coinBalance, setCoinBalance] = useState(0);
  const [coinEnabled, setCoinEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/coins/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setCoinEnabled(d.coinEnabled ?? true); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.id) return;
    fetch("/api/coins/balance").then(r => r.ok ? r.json() : null).then(d => { if (d) { setCoinBalance(d.coins ?? 0); setCoinEnabled(d.coinEnabled ?? true); } }).catch(() => {});
  }, [session?.id]);

  const { data: banners, isLoading: loadingBanners } = useListBanners({ query: { queryKey: getListBannersQueryKey() } });
  const { data: categories, isLoading: loadingCategories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const { data: productsData, isLoading: loadingProducts } = useListProducts(
    { categoryId: selectedCategory, search: search || undefined, limit: 100 },
    { query: { queryKey: getListProductsQueryKey({ categoryId: selectedCategory, search: search || undefined, limit: 100 }) } }
  );
  const addToCart = useAddToCart();

  useEffect(() => {
    const handler = () => setLikedVersion(v => v + 1);
    window.addEventListener("liked-changed", handler);
    return () => window.removeEventListener("liked-changed", handler);
  }, []);

  useEffect(() => {
    fetch("/api/work-schedule")
      .then(r => r.json())
      .then(d => {
        setRestInfo(d);
        if (!d.isOpen) setShowRestModal(true);
      })
      .catch(() => {});
  }, []);

  const handleLike = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLikedProduct({
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      images: product.images ?? [],
      unit: product.unit,
      inStock: product.inStock,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
    });
  };

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingIds.has(product.id) || addedIds.has(product.id)) return;
    setLoadingIds(prev => new Set(prev).add(product.id));
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setLoadingIds(prev => { const s = new Set(prev); s.delete(product.id); return s; });
          setAddedIds(prev => new Set(prev).add(product.id));
          setTimeout(() => setAddedIds(prev => { const s = new Set(prev); s.delete(product.id); return s; }), 2000);
        },
        onError: () => {
          setLoadingIds(prev => { const s = new Set(prev); s.delete(product.id); return s; });
        },
      }
    );
  };

  return (
    <div className="min-h-screen pb-6">
      {/* Dam olish kuni modali */}
      <AnimatePresence>
        {showRestModal && restInfo && !restInfo.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-card rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl border border-border/50"
            >
              <div className="text-5xl mb-4">
                {restInfo.closedReason === "afterHours" ? "🌙" : restInfo.closedReason === "beforeHours" ? "⏰" : "😴"}
              </div>
              <h2 className="text-xl font-bold mb-3">Assalomu aleykum!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {restInfo.closedReason === "afterHours"
                  ? "Ish vaqtimiz tugadi. Ertaga yangi kunda xizmatga tayyormiz!"
                  : restInfo.closedReason === "beforeHours"
                  ? "Hali ish vaqti boshlanmagan. Biroz sabr qiling!"
                  : "Uzur, bugun biz dam olamiz. Hozircha buyurtma berish mumkin emas."}
              </p>
              {restInfo.nextWorkDay && (
                <div className="bg-primary/10 rounded-2xl px-4 py-3 mb-5">
                  <p className="text-xs text-muted-foreground mb-1">
                    {restInfo.closedReason === "beforeHours" ? "Ochilish vaqti:" : "Keyingi ish vaqti:"}
                  </p>
                  <p className="font-bold text-primary capitalize">{restInfo.nextWorkDay}</p>
                </div>
              )}
              <button
                onClick={() => setShowRestModal(false)}
                className="w-full h-12 rounded-2xl bg-muted hover:bg-muted/70 font-medium transition-colors"
                data-testid="button-close-rest-modal"
              >
                Yopish
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 dark:border-white/10 px-4 py-3 flex items-center justify-between">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="h-12 w-auto max-w-[140px] object-contain" />
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              <span className="text-primary">{siteName.slice(0, Math.ceil(siteName.length / 2))}</span>
              <span className="text-foreground">{siteName.slice(Math.ceil(siteName.length / 2))}</span>
            </h1>
          </div>
        )}
        <div className="flex items-center gap-2">
          {session?.id && coinEnabled && (
            <Link href="/profile">
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-full px-2.5 py-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{coinBalance}</span>
              </div>
            </Link>
          )}
          <Link href="/chat">
            <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 w-10 h-10">
              <MessageCircle className="w-5 h-5 text-foreground" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full pl-10 h-12 rounded-2xl bg-muted/50 border-none shadow-inner text-base"
            data-testid="input-search"
          />
        </div>

        {/* Banners */}
        {!search && (
          <div className="w-full overflow-hidden rounded-[2rem] shadow-sm relative">
            {loadingBanners ? (
              <Skeleton className="w-full h-[180px] rounded-[2rem]" />
            ) : banners && banners.length > 0 ? (
              <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                {banners.filter(b => b.isActive).map((banner) => (
                  <div key={banner.id} className="w-full flex-none snap-center relative h-[180px]">
                    <img src={banner.imageUrl} alt={banner.title || ""} className="w-full h-full object-cover" />
                    {banner.title && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                        <h2 className="text-white font-bold text-lg">{banner.title}</h2>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              !selectedCategory ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
            }`}
            data-testid="category-all"
          >
            Barchasi
          </button>
          {loadingCategories ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="w-24 h-10 rounded-full flex-none" />)
          ) : categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
              }`}
              data-testid={`category-${cat.id}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Coin Products Section — only show when user is logged in and coin system is enabled */}
        {session?.id && coinEnabled && !search && !selectedCategory && (() => {
          const coinProducts = productsData?.products.filter((p: any) => p.coinProduct && (p.coinThreshold ?? 0) > 0) ?? [];
          if (coinProducts.length === 0) return null;
          const unlocked = coinProducts.filter((p: any) => coinBalance >= (p.coinThreshold ?? 0));
          const locked = coinProducts.filter((p: any) => coinBalance < (p.coinThreshold ?? 0));
          if (unlocked.length === 0 && locked.length === 0) return null;
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold">Coin mahsulotlar</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4">
                {coinProducts.map((p: any) => {
                  const isUnlocked = coinBalance >= (p.coinThreshold ?? 0);
                  return (
                    <Link key={p.id} href={isUnlocked ? `/product/${p.id}` : "#"}>
                      <div className={`relative flex-none w-40 bg-card rounded-2xl p-3 border shadow-sm transition-all ${isUnlocked ? "border-amber-300 dark:border-amber-600" : "border-border/50 opacity-75"}`}>
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-white/40 dark:bg-black/30 rounded-2xl flex items-center justify-center z-10">
                            <div className="text-center px-2">
                              <div className="text-2xl mb-1">🔒</div>
                              <div className="text-xs font-bold text-amber-700 dark:text-amber-300">{p.coinThreshold} coin kerak</div>
                              <div className="text-xs text-muted-foreground">Sizda: {coinBalance}</div>
                            </div>
                          </div>
                        )}
                        {isUnlocked && (
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-0.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            <Coins className="w-2.5 h-2.5" />
                            {p.coinThreshold}+
                          </div>
                        )}
                        <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-muted/30">
                          <img src={p.images?.[0] || "https://placehold.co/200"} alt={p.name} className="w-full h-full object-contain" />
                        </div>
                        <p className="text-xs font-semibold line-clamp-2 leading-tight mb-1">{p.name}</p>
                        <p className="text-xs font-bold text-amber-600">bonus</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-4">
          {loadingProducts ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="w-full aspect-square rounded-[1.5rem]" />
                <Skeleton className="w-2/3 h-4 rounded" />
                <Skeleton className="w-1/3 h-4 rounded" />
              </div>
            ))
          ) : productsData?.products.map((product, i) => (
            <Link key={product.id} href={`/product/${product.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-[1.5rem] p-3 shadow-sm border border-border/50 relative flex flex-col"
                data-testid={`card-product-${product.id}`}
              >
                <button
                  onClick={(e) => handleLike(e, product)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 glass rounded-full flex items-center justify-center text-red-500 shadow-sm"
                  data-testid={`button-like-${product.id}`}
                >
                  <Heart className={`w-4 h-4 ${isProductLiked(product.id) ? "fill-current" : ""}`} />
                </button>
                <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-muted/30 flex items-center justify-center">
                  <img
                    src={product.images[0] || "https://placehold.co/400"}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1 flex-1">{product.name}</h3>
                <div className="flex items-baseline gap-2 flex-wrap mb-2">
                  <span className="font-bold text-primary text-sm">
                    {product.price.toLocaleString()} so'm
                    <span className="text-xs font-medium opacity-70">/{product.unit ?? "dona"}</span>
                  </span>
                  {product.oldPrice && (
                    <span className="text-xs text-muted-foreground line-through">{product.oldPrice.toLocaleString()}</span>
                  )}
                </div>

                {/* Savatga qo'shish tugmasi */}
                <motion.button
                  onClick={(e) => handleAddToCart(e, product)}
                  disabled={!product.inStock}
                  whileTap={{ scale: 0.92 }}
                  animate={addedIds.has(product.id) ? { scale: [1, 1.12, 1] } : {}}
                  transition={{ duration: 0.25 }}
                  className={`w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all
                    ${addedIds.has(product.id)
                      ? "bg-green-500 text-white"
                      : product.inStock
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  data-testid={`button-add-cart-${product.id}`}
                >
                  {addedIds.has(product.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Qo'shildi!
                    </>
                  ) : loadingIds.has(product.id) ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Savatga
                    </>
                  )}
                </motion.button>
              </motion.div>
            </Link>
          ))}
        </div>
        
        {productsData?.products.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            Mahsulotlar topilmadi
          </div>
        )}
      </div>
    </div>
  );
}
