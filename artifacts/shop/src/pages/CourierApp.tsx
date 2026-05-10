import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, MapPin, Navigation, Package, CheckCircle, Navigation2, Bike, Clock, BatteryCharging } from "lucide-react";
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
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const prevOrderIdsRef = useRef<Set<number>>(new Set());

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      playTone(880, 0, 0.15);
      playTone(1100, 0.18, 0.15);
      playTone(1320, 0.36, 0.25);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {}
  };

  // GPS refs — use watchPosition for continuous tracking
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  // Throttle: only send to server if 5s passed or moved >20m
  const lastSentRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  // Persist GPS state across refreshes
  const GPS_KEY = "courierGpsActive";

  const fetchOrders = async (courierId: number) => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/courier/orders", {
        headers: { "x-courier-id": String(courierId) },
      });
      const data = await res.json();
      const arr: any[] = Array.isArray(data) ? data : [];
      const readyForMe = arr.filter(o => o.status === "ready" && !o.courierId);
      const newIds = new Set(readyForMe.map((o: any) => o.id));
      const hasNew = readyForMe.some((o: any) => !prevOrderIdsRef.current.has(o.id));
      if (prevOrderIdsRef.current.size > 0 && hasNew) {
        playBeep();
        setNewOrderAlert(true);
        setTimeout(() => setNewOrderAlert(false), 5000);
      }
      prevOrderIdsRef.current = newIds;
      setOrders(arr);
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrders(session.id);
      const interval = setInterval(() => fetchOrders(session.id), 5000);

      // Auto-resume GPS if it was active before refresh
      if (localStorage.getItem(GPS_KEY) === "1") {
        startSharing(true);
      }

      return () => clearInterval(interval);
    }
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-acquire Wake Lock when tab becomes visible again
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === "visible" && sharing && "wakeLock" in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        } catch (_) {}
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [sharing]);

  // Haversine distance in metres
  function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const sendLocation = (courierId: number, lat: number, lng: number) => {
    const now = Date.now();
    const last = lastSentRef.current;
    // Only send if 5s passed or moved more than 20 metres
    if (last) {
      const moved = distanceMetres(last.lat, last.lng, lat, lng);
      if (now - last.time < 5000 && moved < 20) return;
    }
    lastSentRef.current = { lat, lng, time: now };
    fetch("/api/courier/location", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-courier-id": String(courierId),
      },
      body: JSON.stringify({ lat, lng }),
    }).catch(() => {});
  };

  const acquireWakeLock = async () => {
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      } catch (_) {}
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  const startSharing = (auto = false) => {
    if (!session) return;
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Qurilmangiz GPS-ni qo'llab-quvvatlamaydi");
      return;
    }

    acquireWakeLock();
    localStorage.setItem(GPS_KEY, "1");
    setSharing(true);

    const beginWatch = (sessionId: number) => {
      // Clear any existing watch first
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          sendLocation(sessionId, pos.coords.latitude, pos.coords.longitude);
          setSharing(true);
          setLocationError("");
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            // Only stop on explicit permission denial
            setLocationError("GPS ruxsati berilmadi. Qurilma sozlamalarini tekshiring.");
            localStorage.removeItem(GPS_KEY);
            setSharing(false);
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
          } else {
            // Timeout or unavailable — silently restart after 3s
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            setTimeout(() => {
              if (localStorage.getItem(GPS_KEY) === "1") {
                beginWatch(sessionId);
              }
            }, 3000);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 20000,
        }
      );

      watchIdRef.current = watchId;
    };

    beginWatch(session.id);
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
    lastSentRef.current = null;
    localStorage.removeItem(GPS_KEY);
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
      <div className="sticky top-0 z-40">
        <div className="glass-panel border-b border-white/20 px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Kuryer paneli</h1>
            <p className="text-xs text-muted-foreground">{session.name} · {session.phone}</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition-colors" data-testid="button-logout">
            <LogOut className="w-5 h-5 text-destructive" />
          </button>
        </div>
        <AnimatePresence>
          {newOrderAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-600 text-white text-center py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2"
            >
              <span className="animate-bounce">🔔</span>
              Yangi buyurtma tayyor — olib keting!
              <span className="animate-bounce">🔔</span>
            </motion.div>
          )}
        </AnimatePresence>
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
                {sharing && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <BatteryCharging className="w-3 h-3 text-green-600" />
                    <p className="text-xs text-green-600">Ekran bloklanganida ham ishlaydi</p>
                  </div>
                )}
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
