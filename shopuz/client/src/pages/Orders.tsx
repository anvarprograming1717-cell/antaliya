import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Package, MapPin, X, Trash2, Phone, Navigation2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useListOrders, getListOrdersQueryKey, useDeleteOrder } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomerSession } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

// Courier scooter icon
const courierIcon = L.divIcon({
  html: `<div style="
    width:50px;height:50px;border-radius:50%;
    background:#4F46E5;border:3px solid white;
    box-shadow:0 3px 14px rgba(79,70,229,0.6);
    display:flex;align-items:center;justify-content:center;
    position:relative;
  ">
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="36" r="6" stroke="white" stroke-width="2.5" fill="none"/>
      <circle cx="36" cy="36" r="6" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M18 36H30" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M30 36L28 24H36L38 30" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M28 24L22 18H14L12 24L18 26L22 24" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 18L24 14" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <circle cx="25" cy="12" r="2.5" fill="white"/>
    </svg>
    <div style="
      position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
      width:0;height:0;border-left:7px solid transparent;
      border-right:7px solid transparent;border-top:8px solid #4F46E5;
    "></div>
  </div>`,
  className: "",
  iconSize: [50, 60],
  iconAnchor: [25, 60],
  popupAnchor: [0, -60],
});

const deliveryIcon = L.divIcon({
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:#EF4444;border:3px solid white;
    box-shadow:0 3px 10px rgba(239,68,68,0.4);
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function MovingMarker({ position }: { position: [number, number] }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon: courierIcon }).addTo(map);
    } else {
      markerRef.current.setLatLng(position);
      map.panTo(position, { animate: true, duration: 0.8 });
    }
    return () => { if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; } };
  }, []);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [position[0], position[1]]);

  return null;
}

function CourierTrackingMap({ order, onClose }: { order: any; onClose: () => void }) {
  const [liveOrder, setLiveOrder] = useState(order);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const courierLat = liveOrder.courierLat;
  const courierLng = liveOrder.courierLng;
  const hasCourierLoc = !!(courierLat && courierLng);

  // Live polling every 5 seconds
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`);
        if (res.ok) {
          const data = await res.json();
          setLiveOrder(data);
        }
      } catch {}
    };
    intervalRef.current = setInterval(fetchOrder, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [order.id]);

  const mapCenter: [number, number] = hasCourierLoc
    ? [courierLat, courierLng]
    : [41.2995, 69.2401];

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-end justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="bg-card w-full max-w-lg rounded-t-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "92vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="font-bold text-base">
              {hasCourierLoc ? "Kuryer yo'lda" : "Buyurtma manzili"}
            </h2>
            {hasCourierLoc && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Real-time kuzatuv</p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Courier info */}
        {liveOrder.courierName && (
          <div className="mx-4 mb-3 bg-primary/5 border border-primary/15 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="5" r="2.5" fill="white"/>
                  <path d="M8 10.5C8 10.5 9.5 9 12 9C14.5 9 16 10.5 16 10.5L15 15H13L12.5 18H11.5L11 15H9L8 10.5Z" fill="white"/>
                  <path d="M9 15L7 19" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M15 15L17 19" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm">{liveOrder.courierName}</p>
                <p className="text-xs text-muted-foreground">{liveOrder.courierPhone}</p>
              </div>
            </div>
            {liveOrder.courierPhone && (
              <a
                href={`tel:${liveOrder.courierPhone}`}
                className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-xl"
              >
                <Phone className="w-3.5 h-3.5" />
                Qo'ng'iroq
              </a>
            )}
          </div>
        )}

        {/* Map */}
        <div style={{ height: 320 }}>
          <MapContainer center={mapCenter} zoom={15} className="w-full h-full" zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {hasCourierLoc && <MovingMarker position={[courierLat, courierLng]} />}
            {liveOrder.address && !hasCourierLoc && (
              <Marker position={mapCenter} icon={deliveryIcon} />
            )}
          </MapContainer>
        </div>

        {/* Address */}
        {liveOrder.address && (
          <div className="px-4 py-3 flex items-start gap-2 border-t border-border">
            <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground line-clamp-2">{liveOrder.address}</p>
          </div>
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
          <Button variant="destructive" onClick={onConfirm} disabled={isPending} className="flex-1 rounded-xl">O'chirish</Button>
        </div>
      </motion.div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  new: "Yangi",
  preparing: "Tayyorlanmoqda",
  ready: "Tayyor",
  delivering: "Yo'lda",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  delivering: "bg-purple-100 text-purple-700",
  delivered: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function Orders() {
  const session = getCustomerSession();
  const queryClient = useQueryClient();
  const [mapOrder, setMapOrder] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: orders, isLoading } = useListOrders(
    { customerId: session?.id },
    { query: { queryKey: getListOrdersQueryKey({ customerId: session?.id }), refetchInterval: 15000 } }
  );
  const deleteOrder = useDeleteOrder();

  const handleDelete = (id: number) => {
    deleteOrder.mutate({ id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }); setDeleteId(null); }
    });
  };

  if (isLoading) {
    return <div className="p-4 space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="w-full h-24 rounded-2xl" />)}</div>;
  }

  return (
    <div className="min-h-screen pb-6">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3">
        <h1 className="text-xl font-bold">Buyurtmalarim</h1>
      </div>

      <div className="px-4 mt-4">
        {!orders || orders.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
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
                  {order.items.length > 2 && <p className="text-xs text-muted-foreground">+{order.items.length - 2} ta boshqa</p>}
                </div>

                {/* Courier tracking card */}
                {order.courierId && order.status === "delivering" && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                            <circle cx="12" cy="36" r="5" stroke="white" strokeWidth="2.5" fill="none"/>
                            <circle cx="36" cy="36" r="5" stroke="white" strokeWidth="2.5" fill="none"/>
                            <path d="M17 36H31" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M31 36L29 24H37L39 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M29 24L23 18H15L13 24L19 26L23 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="26" cy="12" r="2.5" fill="white"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{order.courierName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-xs text-green-600 dark:text-green-400">Yo'lda kelmoqda</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setMapOrder(order)}
                        className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        data-testid={`button-track-${order.id}`}
                      >
                        <Navigation2 className="w-3.5 h-3.5" />
                        Kuzatish
                      </button>
                    </div>
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
        {mapOrder && <CourierTrackingMap order={mapOrder} onClose={() => setMapOrder(null)} />}
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
