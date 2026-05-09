import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, LogOut, Package, Clock, CheckCircle, XCircle, MessageSquare, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getChefSession() {
  return localStorage.getItem("chefAuthenticated") === "true";
}
function clearChefSession() {
  localStorage.removeItem("chefAuthenticated");
}

const STATUS_LABELS: Record<string, string> = {
  new: "Yangi",
  preparing: "Tayyorlanmoqda",
  ready: "Tayyor (kuryerda)",
  delivering: "Yetkazilmoqda",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  preparing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  delivering: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  delivered: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function chefHeaders() {
  return { "Content-Type": "application/json", "x-chef-token": "chef-authenticated" };
}

export default function ChefPanel() {
  const [loggedIn, setLoggedIn] = useState(getChefSession());
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState<"orders" | "messages">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const intervalRef = useRef<any>(null);

  const fetchOrders = async () => {
    try {
      const r = await fetch("/api/chef/orders", { headers: chefHeaders() });
      if (r.ok) setOrders(await r.json());
    } catch {}
  };
  const fetchMessages = async () => {
    try {
      const r = await fetch("/api/chef/messages", { headers: chefHeaders() });
      if (r.ok) setMessages(await r.json());
    } catch {}
  };

  useEffect(() => {
    if (!loggedIn) return;
    fetchOrders();
    fetchMessages();
    intervalRef.current = setInterval(() => { fetchOrders(); fetchMessages(); }, 8000);
    return () => clearInterval(intervalRef.current);
  }, [loggedIn]);

  const handleLogin = async () => {
    if (!password) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const r = await fetch("/api/chef/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        localStorage.setItem("chefAuthenticated", "true");
        setLoggedIn(true);
      } else {
        const d = await r.json();
        setLoginError(d.error || "Parol noto'g'ri");
      }
    } catch {
      setLoginError("Server bilan aloqa yo'q");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    setUpdating(orderId);
    try {
      await fetch(`/api/chef/orders/${orderId}/status`, {
        method: "PATCH",
        headers: chefHeaders(),
        body: JSON.stringify({ status }),
      });
      await fetchOrders();
    } catch {}
    setUpdating(null);
  };

  const handleLogout = () => {
    clearChefSession();
    setLoggedIn(false);
    setPassword("");
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-card rounded-3xl border border-border/50 shadow-xl p-8 space-y-6"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold">Chef Panel</h1>
            <p className="text-sm text-muted-foreground text-center">Oshpaz paneli</p>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold">Parol</label>
            <Input
              type="password"
              placeholder="Parolni kiriting"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="rounded-xl h-12"
            />
            {loginError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{loginError}</p>
            )}
            <Button
              onClick={handleLogin}
              disabled={loginLoading || !password}
              className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loginLoading ? "Kirish..." : "Kirish"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const newOrders = orders.filter(o => o.status === "new");
  const preparingOrders = orders.filter(o => o.status === "preparing");

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-orange-600" />
          </div>
          <span className="font-bold text-lg">Chef Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchOrders(); fetchMessages(); }} className="p-2 rounded-xl hover:bg-muted transition">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex border-b border-border/50 bg-background">
        <button
          onClick={() => setTab("orders")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${tab === "orders" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
        >
          <Package className="w-4 h-4" />
          Buyurtmalar
          {orders.length > 0 && (
            <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{orders.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("messages")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${tab === "messages" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
        >
          <MessageSquare className="w-4 h-4" />
          Chatlar
          {messages.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">{messages.length}</span>
          )}
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {tab === "orders" && (
          <>
            {orders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Hozircha buyurtma yo'q</p>
              </div>
            )}
            {newOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Yangi buyurtmalar ({newOrders.length})
                </h2>
                <div className="space-y-3">
                  {newOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      expanded={expanded === order.id}
                      onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                      onStatus={handleStatusChange}
                      updating={updating === order.id}
                    />
                  ))}
                </div>
              </div>
            )}
            {preparingOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-orange-600 mb-2 flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4" /> Tayyorlanmoqda ({preparingOrders.length})
                </h2>
                <div className="space-y-3">
                  {preparingOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      expanded={expanded === order.id}
                      onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                      onStatus={handleStatusChange}
                      updating={updating === order.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {tab === "messages" && (
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Hozircha xabar yo'q</p>
              </div>
            )}
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${msg.fromAdmin ? "flex-row-reverse" : ""}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${msg.fromAdmin ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {msg.imageUrl && <img src={msg.imageUrl} alt="" className="rounded-xl max-w-full mb-1.5" />}
                  {msg.text && <p>{msg.text}</p>}
                  <p className="text-xs opacity-60 mt-0.5">{new Date(msg.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, expanded, onToggle, onStatus, updating }: any) {
  const items = (() => {
    try { return typeof order.items === "string" ? JSON.parse(order.items) : order.items || []; }
    catch { return []; }
  })();

  return (
    <motion.div
      layout
      className="bg-card rounded-2xl border border-border/50 overflow-hidden"
    >
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center flex-none">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Buyurtma #{order.id}</p>
            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("uz-UZ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || ""}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 px-4 pb-4 space-y-3"
          >
            {order.address && (
              <p className="text-sm text-muted-foreground pt-3">📍 {order.address}</p>
            )}
            {order.note && (
              <p className="text-sm text-muted-foreground">📝 {order.note}</p>
            )}
            {items.length > 0 && (
              <div className="space-y-1.5">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{(item.price * item.quantity).toLocaleString()} so'm</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-border/50">
                  <span>Jami</span>
                  <span>{(order.total || 0).toLocaleString()} so'm</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {order.status === "new" && (
                <Button
                  size="sm"
                  onClick={() => onStatus(order.id, "preparing")}
                  disabled={updating}
                  className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs h-9"
                >
                  <ChefHat className="w-3.5 h-3.5 mr-1" />
                  Tayyorlanmoqda
                </Button>
              )}
              {order.status === "preparing" && (
                <Button
                  size="sm"
                  onClick={() => onStatus(order.id, "ready")}
                  disabled={updating}
                  className="flex-1 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs h-9"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Tayyor — kuryerga yuborish
                </Button>
              )}
              {(order.status === "new" || order.status === "preparing") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatus(order.id, "cancelled")}
                  disabled={updating}
                  className="rounded-xl text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-9"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Bekor
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
