import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, MapPin, Map, Navigation2, UserCheck, UserX, Trash2, MessageSquare, Tag } from "lucide-react";
import {
  useUpdateOrderStatus, useAssignCourier,
  useListCouriers, getListCouriersQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

function CourierSection({ order, couriers, onAssign }: { order: any; couriers: any[]; onAssign: (courierId: number | null) => void }) {
  const [showSelect, setShowSelect] = useState(false);
  const hasCourier = !!order.courierId;
  const courier = couriers.find(c => c.id === order.courierId);
  const courierLat = order.courierLat;
  const courierLng = order.courierLng;
  const mapUrl = courierLat && courierLng
    ? `https://yandex.uz/map-widget/v1/?ll=${courierLng},${courierLat}&pt=${courierLng},${courierLat},pm2rdl&z=16&l=map`
    : null;
  const [showCourierMap, setShowCourierMap] = useState(false);

  return (
    <div className="border-t border-border pt-3 space-y-2">
      <p className="text-sm font-semibold">Kuryer belgilash</p>
      {hasCourier ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Navigation2 className="w-4 h-4 text-primary" />
              <div>
                <p className="font-semibold text-sm">{order.courierName}</p>
                <p className="text-xs text-muted-foreground">{order.courierPhone}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {mapUrl && (
                <button
                  onClick={() => setShowCourierMap(!showCourierMap)}
                  className="px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  GPS
                </button>
              )}
              <button
                onClick={() => onAssign(null)}
                className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <UserX className="w-3.5 h-3.5" />
                Olib tashlash
              </button>
            </div>
          </div>
          {showCourierMap && mapUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-2xl overflow-hidden border border-border"
            >
              <iframe src={mapUrl} width="100%" height="220" allowFullScreen title="Kuryer GPS" className="block" />
            </motion.div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowSelect(!showSelect)}
          className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-all px-3 py-1.5 rounded-xl"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Kuryer belgilash
        </button>
      )}
      {showSelect && !hasCourier && (
        <div className="bg-muted/50 rounded-xl p-2 space-y-1.5 max-h-40 overflow-y-auto">
          {couriers.filter(c => c.isActive).map(c => (
            <button
              key={c.id}
              onClick={() => { onAssign(c.id); setShowSelect(false); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-background transition-colors flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
              {c.lat && c.lng && (
                <span className="text-xs text-green-600 font-semibold">GPS ✓</span>
              )}
            </button>
          ))}
          {couriers.filter(c => c.isActive).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Faol kuryerlar yo'q</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const adminOrdersKey = ["admin-orders", filterStatus];
  const { data: orders } = useQuery({
    queryKey: adminOrdersKey,
    queryFn: async () => {
      const url = filterStatus ? `/api/admin/orders?status=${filterStatus}` : `/api/admin/orders`;
      const res = await fetch(url);
      return res.json();
    },
    refetchInterval: 15000,
  });
  const { data: couriers = [] } = useListCouriers({ query: { queryKey: getListCouriersQueryKey() } });
  const updateStatus = useUpdateOrderStatus();
  const assignCourier = useAssignCourier();
  const deleteOrder = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setDeleteId(null);
      setExpandedId(null);
    },
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate(
      { id, data: { status: status as any } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); } }
    );
  };

  const handleAssignCourier = (orderId: number, courierId: number | null) => {
    assignCourier.mutate(
      { id: orderId, data: { courierId: courierId as any } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); } }
    );
  };

  const handleDelete = (id: number) => {
    deleteOrder.mutate(id);
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold">#{order.id}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                  {order.courierId && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 flex items-center gap-0.5">
                      <Navigation2 className="w-3 h-3" />
                      {order.courierName}
                    </span>
                  )}
                  {order.note && <MessageSquare className="w-3.5 h-3.5 text-amber-500" />}
                  {order.promoCode && <Tag className="w-3.5 h-3.5 text-green-500" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{order.customerName || order.customerPhone} • {new Date(order.createdAt).toLocaleString("uz-UZ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold">{(order.totalPrice as number).toLocaleString()} so'm</p>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteId(order.id); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors"
                  data-testid={`button-delete-order-${order.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                  {order.promoCode && (
                    <div className="col-span-2 flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 dark:text-green-400 text-sm">
                        Promokod: <strong>{order.promoCode}</strong>
                        {order.discountAmount > 0 && ` — ${(order.discountAmount as number).toLocaleString()} so'm chegirma`}
                      </span>
                    </div>
                  )}
                  {order.note && (
                    <div className="col-span-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
                      <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-none" />
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Izoh:</p>
                        <p className="text-sm font-medium">{order.note}</p>
                      </div>
                    </div>
                  )}
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

                {/* Courier Assignment */}
                {order.deliveryMethod === "delivery" && (
                  <CourierSection
                    order={order}
                    couriers={couriers}
                    onAssign={(courierId) => handleAssignCourier(order.id, courierId)}
                  />
                )}
              </motion.div>
            )}
          </motion.div>
        ))}

        {orders?.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">Buyurtmalar topilmadi</div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="font-bold text-lg mb-2">Buyurtmani o'chirish</h3>
            <p className="text-muted-foreground text-sm mb-5">#{deleteId} raqamli buyurtma butunlay o'chiriladi.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 rounded-xl">Bekor</Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                disabled={deleteOrder.isPending}
                className="flex-1 rounded-xl"
              >
                O'chirish
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
