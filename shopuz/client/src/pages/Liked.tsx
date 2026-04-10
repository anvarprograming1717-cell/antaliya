import { motion } from "framer-motion";
import { Heart, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { useGetLiked, getGetLikedQueryKey, useToggleLike, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Liked() {
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useGetLiked({ query: { queryKey: getGetLikedQueryKey() } });
  const toggleLike = useToggleLike();

  const handleUnlike = (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike.mutate(
      { data: { productId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLikedQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3">
        <h1 className="text-xl font-bold">Sevimlilar</h1>
        {products && products.length > 0 && (
          <p className="text-xs text-muted-foreground">{products.length} ta mahsulot</p>
        )}
      </div>

      <div className="px-4 mt-4">
        {!products || products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-red-300" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sevimlilar bo'sh</h3>
            <p className="text-muted-foreground text-sm mb-6">Yoqtirgan mahsulotlaringizni bu yerda saqlang</p>
            <Link href="/">
              <Button className="rounded-2xl px-8">Mahsulotlarni ko'rish</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product, i) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-3 border border-border/50 relative shadow-sm"
                  data-testid={`liked-product-${product.id}`}
                >
                  <button
                    onClick={(e) => handleUnlike(e, product.id)}
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md"
                    data-testid={`button-unlike-${product.id}`}
                  >
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </button>
                  <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-muted/30">
                    <img src={product.images?.[0] || "https://placehold.co/400"} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</h3>
                  <span className="font-bold text-primary text-sm">{(product.price as number).toLocaleString()} so'm</span>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
