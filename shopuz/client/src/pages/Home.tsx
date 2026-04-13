import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, MessageCircle, ShoppingBag, ShoppingCart, Check, X } from "lucide-react";
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

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [, setLikedVersion] = useState(0);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [restInfo, setRestInfo] = useState<{ isOpen: boolean; nextWorkDay: string } | null>(null);
  const [showRestModal, setShowRestModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: siteSettings } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });
  const siteName = siteSettings?.siteName || "ShopUz";
  const logoUrl = siteSettings?.logoUrl || null;

  const { data: banners, isLoading: loadingBanners } = useListBanners({ query: { queryKey: getListBannersQueryKey() } });
  const { data: categories, isLoading: loadingCategories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const { data: productsData, isLoading: loadingProducts } = useListProducts(
    { categoryId: selectedCategory, search: search || undefined },
    { query: { queryKey: getListProductsQueryKey({ categoryId: selectedCategory, search: search || undefined }) } }
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
              <div className="text-5xl mb-4">🌙</div>
              <h2 className="text-xl font-bold mb-3">Assalomu aleykum!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Uzur, bugun biz dam olamiz. Hozircha buyurtma berish mumkin emas.
              </p>
              {restInfo.nextWorkDay && (
                <div className="bg-primary/10 rounded-2xl px-4 py-3 mb-5">
                  <p className="text-xs text-muted-foreground mb-1">Keyingi ish kuni:</p>
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
          <img src={logoUrl} alt={siteName} className="h-8 w-auto max-w-[120px] object-contain" />
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
        <Link href="/chat">
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 w-10 h-10">
            <MessageCircle className="w-5 h-5 text-foreground" />
          </Button>
        </Link>
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
