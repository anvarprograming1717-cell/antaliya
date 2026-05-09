import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, MapPin, Navigation, Package, CheckCircle, Navigation2, Bike, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const STATUS_LABELS: Record<string, string> = {
  new: "Yangi",
  preparing: "Tayyorlanmoqda",
  ready: "Tayyor (olib ketish)",
  delivering: "Yetkazilmoqda",
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

function getCourierSession() {
  const id = localStorage.getItem("courierId");
  const name = localStorage.getItem("courierName");
  const phone = localStorage.getItem("courierPhone");
  if (!id) return null;
  return { id: parseInt(id), name, phone };
}

function clearCourierSession() {
  localStorage.removeItem("courierId");
  localStorage.removeItem("courierName");
  localStorage.removeItem("courierPhone");
}

function MapWidget({ lat, lng, address }: { lat?: number; lng?: number; address?: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );

  useEffect(() => {
    if (lat && lng) { setCoords({ lat, lng }); return; }
    if (!address) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=uz`)
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      })
      .catch(() => {});
  }, [lat, lng, address]);

  if (!coords) {
    if (!address) return null;
    return (
      <div className="rounded-2xl border border-border bg-muted/30 h-14 flex items-center px-3 gap-2 text-xs text-muted-foreground">
        <MapPin className="w-4 h-4 shrink-0" />
        <span className="truncate">{address}</span>
      </div>
    );
  }

  const { lat: la, lng: lo } = coords;
  const delta = 0.008;
  const bbox = `${lo - delta},${la - delta},${lo + delta},${la + delta}`;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${la},${lo}`;
  return (
    <div className="space-y-1">
      <iframe
        src={url}
        width="100%"
        height="200"
        className="rounded-2xl border border-border block"
        title="Manzil xaritasi"
      />
      <a
        href={`https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=16/${la}/${lo}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary flex items-center gap-1 px-1"
      >
        <Navigation className="w-3 h-3" /> Katta xaritada ko'rish
      </a>
    </div>
  );
}

export default function CourierApp() {
  const { t } = useT();
  const [session, setSession] = useState(getCourierSession());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [delivering, setDelivering] = useState<number | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = async (courierId: number) => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/courier/orders", {
        headers: { "x-courier-id": String(courierId) },
      });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrders(session.id);
      const interval = setInterval(() => fetchOrders(session.id), 15000);
      return () => clearInterval(interval);
    }
  }, [session?.id]);

  const sendLocation = (courierId: number, lat: number, lng: number) => {
    fetch("/api/courier/location", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-courier-id": String(courierId),
      },
      body: JSON.stringify({ lat, lng }),
    }).catch(() => {});
  };

  const startSharing = () => {
    if (!session) return;
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Qurilmangiz GPS-ni qo'llab-quvvatlamaydi");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(session.id, pos.coords.latitude, pos.coords.longitude);
        setSharing(true);
        locationIntervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => sendLocation(session.id, p.coords.latitude, p.coords.longitude),
            () => {}
          );
        }, 8000);
      },
      () => {
        setLocationError("GPS ruxsati berilmadi. Qurilma sozlamalarini tekshiring.");
      }
    );
  };

  const stopSharing = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setSharing(false);
  };

  const handleAccept = async (orderId: number) => {
    if (!session) return;
    setAccepting(orderId);
    try {
      const res = await fetch(`/api/courier/orders/${orderId}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-courier-id": String(session.id) },
      });
      if (res.ok) {
        await fetchOrders(session.id);
        // Auto-start GPS sharing when accepting an order
        if (!sharing) startSharing();
      }
    } catch {}
    setAccepting(null);
  };

  const handleDelivered = async (orderId: number) => {
    if (!session) return;
    setDelivering(orderId);
    try {
      const res = await fetch(`/api/courier/orders/${orderId}/delivered`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-courier-id": String(session.id) },
      });
      if (res.ok) await fetchOrders(session.id);
    } catch {}
    setDelivering(null);
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/courier/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Login yoki parol noto'g'ri");
        return;
      }
      localStorage.setItem("courierId", String(data.id));
      localStorage.setItem("courierName", data.name);
      localStorage.setItem("courierPhone", data.phone);
      setSession({ id: data.id, name: data.name, phone: data.phone });
    } catch {
      setLoginError("Server bilan bog'lanib bo'lmadi");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    stopSharing();
    clearCourierSession();
    setSession(null);
    setOrders([]);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="glass-panel rounded-3xl p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bike className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Kuryer paneli</h1>
              <p className="text-muted-foreground text-sm mt-1">ShopUz kuryer tizimi</p>
            </div>
            <div className="space-y-3">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Login"
                className="rounded-2xl h-12"
                data-testid="input-username"
              />
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Parol"
                className="rounded-2xl h-12"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                data-testid="input-password"
              />
              {loginError && <p className="text-sm text-destructive">{loginError}</p>}
              <Button
                onClick={handleLogin}
                disabled={loginLoading || !username || !password}
                className="w-full h-12 rounded-2xl text-base font-semibold"
                data-testid="button-login"
              >
                {loginLoading ? "Kirilmoqda..." : "Kirish"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const readyOrders = orders.filter(o => o.status === "ready" && !o.courierId);
  const myOrders = orders.filter(o => o.courierId === session.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Kuryer paneli</h1>
          <p className="text-xs text-muted-foreground">{session.name} · {session.phone}</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition-colors" data-testid="button-logout">
          <LogOut className="w-5 h-5 text-destructive" />
        </button>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* GPS Location Card */}
        <div className={`rounded-2xl p-4 border ${sharing ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "border-border bg-card"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className={`w-5 h-5 ${sharing ? "text-green-600" : "text-muted-foreground"}`} />
              <div>
                <p className="font-semibold text-sm">
                  {sharing ? "GPS faol — mijozlar ko'rmoqda" : "GPS o'chirilgan"}
                </p>
                {locationError && <p className="text-xs text-destructive mt-0.5">{locationError}</p>}
              </div>
            </div>
            <Button
              onClick={sharing ? stopSharing : startSharing}
              variant={sharing ? "outline" : "default"}
              size="sm"
              className="rounded-xl text-sm"
              data-testid="button-toggle-location"
            >
              {sharing ? "O'chirish" : "Yoqish"}
            </Button>
          </div>
        </div>

        {/* Ready orders to pick up */}
        {readyOrders.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              Olib ketish kerak ({readyOrders.length})
            </h2>
            <div className="space-y-3">
              {readyOrders.map(order => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-green-200 dark:border-green-900/50 rounded-2xl overflow-hidden"
                >
                  <button
                    className="w-full px-4 py-3 flex items-center justify-between"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm">Buyurtma #{order.id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{order.address || "Manzil yo'q"}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      Tayyor
                    </span>
                  </button>
                  <AnimatePresence>
                    {expandedOrder === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border px-4 pb-4 space-y-3"
                      >
                        {order.address && (
                          <div className="pt-3">
                            <p className="text-xs text-muted-foreground mb-1">Yetkazish manzili</p>
                            <div className="flex items-start gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-none" />
                              <p className="font-medium text-sm">{order.address}</p>
                            </div>
                            <MapWidget address={order.address} />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Jami:</span>
                          <span className="font-bold">{order.totalPrice?.toLocaleString()} so'm</span>
                        </div>
                        <Button
                          onClick={() => handleAccept(order.id)}
                          disabled={accepting === order.id}
                          className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white h-10"
                        >
                          {accepting === order.id ? "Qabul qilinmoqda..." : "✓ Qabul qilish va yetkazishni boshlash"}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* My active deliveries */}
        <div>
          <h2 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Bike className="w-4 h-4" />
            Mening yetkazuvlarim
            {ordersLoading && <span className="text-xs opacity-60">(yangilanmoqda...)</span>}
          </h2>
          {myOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Hozircha buyurtma yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((order) => (
                <motion.div key={order.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <button
                    className="w-full px-4 py-3 flex items-center justify-between"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm">Buyurtma #{order.id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("uz-UZ")}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || ""}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </button>
                  <AnimatePresence>
                    {expandedOrder === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border px-4 pb-4 space-y-3"
                      >
                        {order.address && (
                          <div className="pt-3">
                            <p className="text-xs text-muted-foreground mb-1">Manzil</p>
                            <div className="flex items-start gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-none" />
                              <p className="font-medium text-sm">{order.address}</p>
                            </div>
                            <MapWidget address={order.address} />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Jami:</span>
                          <span className="font-bold">{order.totalPrice?.toLocaleString()} so'm</span>
                        </div>
                        {order.status === "delivering" && (
                          <Button
                            onClick={() => handleDelivered(order.id)}
                            disabled={delivering === order.id}
                            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white h-10"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {delivering === order.id ? "Saqlanmoqda..." : "Yetkazildi ✓"}
                          </Button>
                        )}
                        {order.status === "delivered" && (
                          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Muvaffaqiyatli yetkazildi
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
