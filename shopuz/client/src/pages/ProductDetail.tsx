import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, ShoppingCart, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useGetProduct, getGetProductQueryKey, useAddToCart, useToggleLike, getGetCartQueryKey, getGetLikedQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStickyBar } from "@/lib/stickyBar";

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, setLocation] = useLocation();
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const queryClient = useQueryClient();
  const { setBottomBar } = useStickyBar();

  const { data: product, isLoading } = useGetProduct(id, { query: { enabled: !!id, queryKey: getGetProductQueryKey(id) } });
  const addToCart = useAddToCart();
  const toggleLike = useToggleLike();

  const handleAddToCart = () => {
    if (!product) return;
    addToCart.mutate(
      { data: { productId: product.id, quantity: qty } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        },
      }
    );
  };

  // Sticky pastki panel — faqat shu sahifada ko'rinadi, chiqqanda tozalanadi
  useEffect(() => {
    if (!product) return;
    setBottomBar(
      <div className="glass rounded-3xl shadow-2xl flex items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2 bg-background/60 rounded-2xl px-3 py-2 shrink-0">
          <button
            onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-8 h-8 rounded-full bg-card shadow flex items-center justify-center font-bold text-lg"
            data-testid="button-decrease-qty"
          >
            -
          </button>
          <span className="w-7 text-center font-bold text-base" data-testid="text-quantity">{qty}</span>
          <button
            onClick={() => setQty(q => q + 1)}
            className="w-8 h-8 rounded-full bg-card shadow flex items-center justify-center font-bold text-lg"
            data-testid="button-increase-qty"
          >
            +
          </button>
        </div>
        <Button
          onClick={handleAddToCart}
          disabled={!product.inStock || addToCart.isPending}
          className={`flex-1 h-12 rounded-2xl text-sm font-semibold transition-all ${added ? "bg-green-600 hover:bg-green-600" : ""}`}
          data-testid="button-add-to-cart"
        >
          {added ? (
            <><Check className="w-4 h-4 mr-1.5" /> Qo'shildi!</>
          ) : (
            <><ShoppingCart className="w-4 h-4 mr-1.5" /> Savatchaga qo'shish</>
          )}
        </Button>
      </div>
    );
    return () => setBottomBar(null);
  }, [product, qty, added, addToCart.isPending]);

  const handleLike = () => {
    if (!product) return;
    toggleLike.mutate(
      { data: { productId: product.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetLikedQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="w-full aspect-square rounded-3xl" />
        <Skeleton className="w-3/4 h-6" />
        <Skeleton className="w-1/2 h-5" />
      </div>
    );
  }

  if (!product) return <div className="p-4 text-center">Mahsulot topilmadi</div>;

  const images = product.images && product.images.length > 0 ? product.images : ["https://placehold.co/600"];

  return (
    <div className="min-h-screen pb-32">
      {/* Image Section */}
      <div className="relative bg-muted/30">
        <div className="aspect-square overflow-hidden">
          <img src={images[imageIndex]} alt={product.name} className="w-full h-full object-cover" />
        </div>

        <button
          onClick={() => setLocation("/")}
          className="absolute top-4 left-4 w-10 h-10 glass rounded-full flex items-center justify-center shadow-lg"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleLike}
          className="absolute top-4 right-4 w-10 h-10 glass rounded-full flex items-center justify-center shadow-lg text-red-500"
          data-testid="button-like"
        >
          <Heart className={`w-5 h-5 ${product.isLiked ? "fill-current" : ""}`} />
        </button>

        {images.length > 1 && (
          <>
            <button
              onClick={() => setImageIndex(i => Math.max(0, i - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 glass rounded-full flex items-center justify-center"
              data-testid="button-prev-image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImageIndex(i => Math.min(images.length - 1, i + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 glass rounded-full flex items-center justify-center"
              data-testid="button-next-image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === imageIndex ? "bg-primary w-5" : "bg-white/60"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Product Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-5 space-y-4"
      >
        {product.categoryName && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {product.categoryName}
          </span>
        )}

        <h1 className="text-2xl font-bold" data-testid="text-product-name">{product.name}</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-black text-primary">
            {(product.price as number).toLocaleString()} so'm
            <span className="text-base font-semibold text-primary/70 ml-1">/{product.unit ?? "dona"}</span>
          </span>
          {product.oldPrice && (
            <span className="text-base text-muted-foreground line-through">{(product.oldPrice as number).toLocaleString()} so'm</span>
          )}
          {product.oldPrice && (
            <span className="bg-destructive/10 text-destructive text-xs font-bold px-2 py-1 rounded-full">
              -{Math.round((1 - (product.price as number) / (product.oldPrice as number)) * 100)}%
            </span>
          )}
        </div>

        <div className={`flex items-center gap-2 text-sm font-medium ${product.inStock ? "text-green-600" : "text-destructive"}`}>
          <div className={`w-2 h-2 rounded-full ${product.inStock ? "bg-green-500" : "bg-destructive"}`} />
          {product.inStock ? "Mavjud" : "Tugagan"}
        </div>

        {product.description && (
          <div className="bg-muted/40 rounded-2xl p-4">
            <h3 className="font-semibold mb-2 text-sm">Tavsif</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
