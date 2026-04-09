import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Clock, ChevronRight, Package } from "lucide-react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomerSession } from "@/lib/auth";

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

export default function Orders() {
  const session = getCustomerSession();
  const { data: orders, isLoading } = useListOrders(
    { customerId: session?.id },
    { query: { queryKey: getListOrdersQueryKey({ customerId: session?.id }) } }
  );

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
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
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
    </div>
  );
}
