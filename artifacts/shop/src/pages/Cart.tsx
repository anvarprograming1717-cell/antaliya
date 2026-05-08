import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2, ArrowRight, Package } from "lucide-react";
import { useGetCart, getGetCartQueryKey, useUpdateCartItem, useRemoveFromCart, useGetDeliverySettings, getGetDeliverySettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Cart() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: cartItems, isLoading } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const { data: deliverySettings } = useGetDeliverySettings({ query: { queryKey: getGetDeliverySettingsQueryKey() } });
  const DELIVERY_FEE_AMOUNT = deliverySettings?.deliveryFee ?? 15000;
  const FREE_THRESHOLD = deliverySettings?.freeDeliveryThreshold ?? 300000;
  const updateCart = useUpdateCartItem();
  const removeCart = useRemoveFromCart();

  const handleUpdate = (id: number, qty: number) => {
    if (qty < 1) return;
    updateCart.mutate({ id, data: { quantity: qty } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }),
    });
  };

  const handleRemove = (id: number) => {
    removeCart.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }),
    });
  };

  const subtotal = cartItems?.reduce((sum, item) => sum + (item.product.price as number) * item.quantity, 0) || 0;
  const DELIVERY_FEE = subtotal >= FREE_THRESHOLD ? 0 : DELIVERY_FEE_AMOUNT;
  const total = subtotal + DELIVERY_FEE;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="w-full h-24 rounded-2xl" />
        <Skeleton className="w-full h-24 rounded-2xl" />
        <Skeleton className="w-full h-24 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3">
        <h1 className="text-xl font-bold">Savatcha</h1>
        {cartItems && cartItems.length > 0 && (
          <p className="text-xs text-muted-foreground">{cartItems.length} ta mahsulot</p>
        )}
      </div>

      <div className="px-4 mt-4">
        {!cartItems || cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Savatcha bo'sh</h3>
            <p className="text-muted-foreground text-sm mb-6">Xarid qilish uchun mahsulot qo'shing</p>
            <Button onClick={() => setLocation("/")} className="rounded-2xl px-8" data-testid="button-shop">
              Xarid qilish
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-4 border border-border/50 flex gap-3"
                data-testid={`cart-item-${item.id}`}
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-none">
                  <img
                    src={item.product.images?.[0] || "https://placehold.co/80"}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{item.product.name}</h3>
                  <p className="text-primary font-bold">{((item.product.price as number) * item.quantity).toLocaleString()} so'm</p>
                  <p className="text-xs text-muted-foreground">{(item.product.price as number).toLocaleString()} so'm/dona</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => handleRemove(item.id)} className="text-destructive" data-testid={`button-remove-${item.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 bg-muted rounded-xl px-2 py-1">
                    <button onClick={() => handleUpdate(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center font-bold" data-testid={`button-decrease-${item.id}`}>-</button>
                    <span className="w-5 text-center text-sm font-bold" data-testid={`text-qty-${item.id}`}>{item.quantity}</span>
                    <button onClick={() => handleUpdate(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center font-bold" data-testid={`button-increase-${item.id}`}>+</button>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Order Summary */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 mt-4 space-y-3">
              <h3 className="font-bold">Buyurtma xulosasi</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mahsulotlar</span>
                <span>{subtotal.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Yetkazib berish</span>
                <span className={DELIVERY_FEE === 0 ? "text-green-600 font-medium" : ""}>{DELIVERY_FEE === 0 ? "Bepul" : `${DELIVERY_FEE.toLocaleString()} so'm`}</span>
              </div>
              {DELIVERY_FEE > 0 && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-2">
                  {(FREE_THRESHOLD - subtotal).toLocaleString()} so'm qo'shsangiz, yetkazib berish bepul!
                </p>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                <span>Jami</span>
                <span className="text-primary">{total.toLocaleString()} so'm</span>
              </div>
            </div>

            <Button
              onClick={() => setLocation("/checkout")}
              className="w-full h-14 rounded-2xl text-base font-semibold mt-2"
              data-testid="button-checkout"
            >
              Buyurtma berish
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
