import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, MapPin, Map } from "lucide-react";
import { useListOrders, getListOrdersQueryKey, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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

const STATUSES = ["new", "preparing", "delivered", "cancelled"] as const;

function YandexMapEmbed({ address }: { address: string }) {
  const [showMap, setShowMap] = useState(false);
  const encodedAddress = encodeURIComponent(address);
  const mapUrl = `https://yandex.uz/map-widget/v1/?text=${encodedAddress}&lang=uz_UZ&z=15&l=map`;

  return (
    <div className="col-span-2">
      <p className="text-muted-foreground mb-1">Manzil</p>
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-none" />
        <p className="font-medium text-sm flex-1">{address}</p>
      </div>
      <button
        onClick={() => setShowMap(!showMap)}
        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-all px-3 py-1.5 rounded-xl"
      >
        <Map className="w-3.5 h-3.5" />
        {showMap ? "Xaritani yopish" : "Xaritada ko'rsatish"}
      </button>

      {showMap && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 rounded-2xl overflow-hidden border border-border"
        >
          <iframe
            src={mapUrl}
            width="100%"
            height="280"
            frameBorder="0"
            allowFullScreen
            title="Yetkazib berish manzili"
            className="block"
          />
        </motion.div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: orders } = useListOrders(
    { status: filterStatus as any },
    { query: { queryKey: getListOrdersQueryKey({ status: filterStatus as any }) } }
  );
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate(
      { id, data: { status: status as any } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }); } }
    );
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Buyurtmalar</h1>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus(undefined)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!filterStatus ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          data-testid="filter-all"
        >
          Barchasi
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            data-testid={`filter-${s}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {orders?.map((order, i) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-2xl border border-border/50 overflow-hidden"
            data-testid={`order-${order.id}`}
          >
            <div
              className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-muted/20"
              onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">#{order.id}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{order.customerName || order.customerPhone} • {new Date(order.createdAt).toLocaleString("uz-UZ")}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold">{(order.totalPrice as number).toLocaleString()} so'm</p>
                {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {expandedId === order.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border-t border-border px-4 py-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Yetkazib berish</p>
                    <p className="font-medium">{order.deliveryMethod === "delivery" ? "Yetkazib berish" : "Olib ketish"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">To'lov</p>
                    <p className="font-medium capitalize">{order.paymentMethod}</p>
                  </div>
                  {order.address && (
                    <YandexMapEmbed address={order.address} />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Mahsulotlar</p>
                  <div className="space-y-2">
                    {order.items.map(item => (
                      <div key={item.id} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground w-5 flex-none">{item.quantity}x</span>
                        <span className="flex-1">{item.productName}</span>
                        <span className="font-medium">{((item.price as number) * item.quantity).toLocaleString()} so'm</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Holatni o'zgartirish</p>
                  <div className="flex gap-2 flex-wrap">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(order.id, s)}
                        disabled={order.status === s || updateStatus.isPending}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${order.status === s ? STATUS_COLORS[s] : "bg-muted hover:bg-muted/70"}`}
                        data-testid={`button-status-${s}-${order.id}`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}

        {orders?.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">Buyurtmalar topilmadi</div>
        )}
      </div>
    </div>
  );
}
