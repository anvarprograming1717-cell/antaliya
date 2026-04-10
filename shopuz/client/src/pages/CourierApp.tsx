import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { LogOut, MapPin, Navigation, Package, Clock, CheckCircle, Navigation2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

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
  if (lat && lng) {
    const url = `https://yandex.uz/map-widget/v1/?ll=${lng},${lat}&pt=${lng},${lat},pm2rdl&z=16&l=map`;
    return (
      <iframe
        src={url}
        width="100%"
        height="220"
        className="rounded-2xl border border-border"
        allowFullScreen
        title="Manzil xaritasi"
      />
    );
  }
  if (address) {
    const encoded = encodeURIComponent(address);
    const url = `https://yandex.uz/map-widget/v1/?text=${encoded}&lang=uz_UZ&z=15&l=map`;
    return (
      <iframe
        src={url}
        width="100%"
        height="220"
        className="rounded-2xl border border-border"
        allowFullScreen
        title="Manzil xaritasi"
      />
    );
  }
  return null;
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
      const interval = setInterval(() => fetchOrders(session.id), 30000);
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
    }).catch(console.error);
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
        }, 10000);
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
                <Navigation2 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">{t("courierLogin")}</h1>
              <p className="text-muted-foreground text-sm mt-1">ShopUz kuryer tizimi</p>
            </div>
            <div className="space-y-3">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("username")}
                className="rounded-2xl h-12"
                data-testid="input-username"
              />
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={t("password")}
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
                {loginLoading ? "Kirilmoqda..." : t("login")}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{t("courierDashboard")}</h1>
          <p className="text-xs text-muted-foreground">{session.name} · {session.phone}</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition-colors" data-testid="button-logout">
          <LogOut className="w-5 h-5 text-destructive" />
        </button>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Location Card */}
        <div className={`rounded-2xl p-4 border ${sharing ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "border-border bg-card"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className={`w-5 h-5 ${sharing ? "text-green-600" : "text-muted-foreground"}`} />
              <div>
                <p className="font-semibold text-sm">{sharing ? t("locationActive") : t("locationInactive")}</p>
                {locationError && <p className="text-xs text-destructive mt-0.5">{locationError}</p>}
              </div>
            </div>
            <Button
              onClick={sharing ? stopSharing : startSharing}
              variant={sharing ? "outline" : "default"}
              className="rounded-xl h-9 text-sm"
              data-testid="button-toggle-location"
            >
              {sharing ? t("stopSharing") : t("shareLocation")}
            </Button>
          </div>
        </div>

        {/* Orders */}
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            {t("myDeliveries")}
            {ordersLoading && <span className="text-xs text-muted-foreground">(yangilanmoqda...)</span>}
          </h2>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Hozircha yetkazib beriladigan buyurtma yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-card border border-border rounded-2xl overflow-hidden">
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
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </button>
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border-t border-border px-4 py-3 space-y-3"
                    >
                      {order.address && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Manzil</p>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-none" />
                            <p className="font-medium text-sm">{order.address}</p>
                          </div>
                        </div>
                      )}
                      {order.address && (
                        <MapWidget address={order.address} />
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Jami:</span>
                        <span className="font-bold">{order.totalPrice?.toLocaleString()} so'm</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
