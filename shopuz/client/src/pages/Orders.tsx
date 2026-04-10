import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Package, MapPin, Navigation2, User, Phone, X, Trash2 } from "lucide-react";
import { useListOrders, getListOrdersQueryKey, useDeleteOrder } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomerSession } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  new: "Yangi",
  preparing: "Tayyorlanmoqda",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function CourierMapModal({ order, onClose }: { order: any; onClose: () => void }) {
  const lat = order.courierLat;
  const lng = order.courierLng;
  const hasLoc = lat && lng;
  const mapUrl = hasLoc
    ? `https://yandex.uz/map-widget/v1/?ll=${lng},${lat}&pt=${lng},${lat},pm2rdl&z=16&l=map`
    : order.address
    ? `https://yandex.uz/map-widget/v1/?text=${encodeURIComponent(order.address)}&lang=uz_UZ&z=15&l=map`
    : null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-3xl p-5 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">
            {hasLoc ? "Kuryer joylashuvi" : "Yetkazib berish manzili"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        {order.courierName && (
          <div className="flex items-center gap-3 mb-4 bg-muted/50 rounded-xl p-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Navigation2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{order.courierName}</p>
              <a href={`tel:${order.courierPhone}`} className="text-sm text-primary font-medium">{order.courierPhone}</a>
            </div>
          </div>
        )}
        {mapUrl ? (
          <iframe
            src={mapUrl}
            width="100%"
            height="280"
            className="rounded-2xl border border-border"
            allowFullScreen
            title="Xarita"
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">Xarita ma'lumoti mavjud emas</div>
        )}
      </motion.div>
    </div>
  );
}

function DeleteOrderModal({ orderId, onConfirm, onCancel, isPending }: { orderId: number; onConfirm: () => void; onCancel: () => void; isPending: boolean }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-2">Buyurtmani o'chirish</h3>
        <p className="text-muted-foreground text-sm mb-5">#{orderId} raqamli buyurtma ro'yxatingizdan o'chiriladi.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">Bekor</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending} className="flex-1 rounded-xl">
            O'chirish
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Orders() {
  const session = getCustomerSession();
  const queryClient = useQueryClient();
  const [mapOrder, setMapOrder] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: orders, isLoading } = useListOrders(
    { customerId: session?.id },
    { query: { queryKey: getListOrdersQueryKey({ customerId: session?.id }), refetchInterval: 30000 } }
  );
  const deleteOrder = useDeleteOrder();

  const handleDelete = (id: number) => {
    deleteOrder.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        setDeleteId(null);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="w-full h-24 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3">
        <h1 className="text-xl font-bold">Buyurtmalarim</h1>
      </div>

      <div className="px-4 mt-4">
        {!orders || orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Buyurtmalar yo'q</h3>
            <p className="text-muted-foreground text-sm">Siz hali buyurtma bermadingiz</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-4 border border-border/50"
                data-testid={`order-${order.id}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Buyurtma #{order.id}</p>
                    <p className="font-bold text-base mt-0.5">{(order.totalPrice as number).toLocaleString()} so'm</p>
                    {(order.discountAmount as number) > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">Chegirma: -{(order.discountAmount as number).toLocaleString()} so'm</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    {(order.status === "delivered" || order.status === "cancelled") && (
                      <button
                        onClick={() => setDeleteId(order.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors"
                        data-testid={`button-delete-order-${order.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {order.items.slice(0, 2).map(item => (
                    <div key={item.id} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground w-5">{item.quantity}x</span>
                      <span className="line-clamp-1">{item.productName}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs text-muted-foreground">+{order.items.length - 2} ta boshqa</p>
                  )}
                </div>

                {/* Courier Info (shown when preparing) */}
                {order.courierId && order.status === "preparing" && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation2 className="w-4 h-4 text-primary flex-none" />
                      <div>
                        <p className="text-xs text-muted-foreground">Kuryer</p>
                        <p className="font-semibold text-sm">{order.courierName}</p>
                        {order.courierPhone && (
                          <a href={`tel:${order.courierPhone}`} className="text-xs text-primary flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.courierPhone}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setMapOrder(order)}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      data-testid={`button-track-${order.id}`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Ko'rish
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(order.createdAt).toLocaleDateString("uz-UZ")}</span>
                  </div>
                  <span>{order.deliveryMethod === "delivery" ? "Yetkazib berish" : "Olib ketish"}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {mapOrder && <CourierMapModal order={mapOrder} onClose={() => setMapOrder(null)} />}
        {deleteId && (
          <DeleteOrderModal
            orderId={deleteId}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
            isPending={deleteOrder.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
