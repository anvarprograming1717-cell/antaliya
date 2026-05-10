import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat, LogOut, Package, Clock, CheckCircle, XCircle,
  MessageSquare, RefreshCw, ChevronDown, ChevronUp, Send, ArrowLeft,
} from "lucide-react";
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

// ─── Chat Tab ────────────────────────────────────────────────────────────────

interface ChatItem {
  customerId: number;
  customerName: string;
  customerPhone: string;
  messages: any[];
  unreadCount: number;
  lastMessage: any;
}

function ChefChat() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatsRef = useRef<ChatItem[]>([]);
  const selectedIdRef = useRef<number | null>(null);

  // Keep refs in sync with state (avoids stale closure in interval)
  const updateChats = (data: ChatItem[]) => {
    chatsRef.current = data;
    setChats(data);
  };

  const selectCustomer = (id: number | null) => {
    selectedIdRef.current = id;
    setSelectedId(id);
  };

  // Derive selected chat from ID — always reads latest chats
  const selected = chats.find(c => c.customerId === selectedId) ?? null;

  const fetchChats = useCallback(async () => {
    try {
      const r = await fetch("/api/chef/messages", { headers: { "x-chef-token": "chef-authenticated" } });
      if (r.ok) {
        const data: ChatItem[] = await r.json();
        updateChats(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages?.length]);

  const handleSend = async () => {
    if (!text.trim() || selectedId === null || sending) return;
    const msgText = text.trim();
    setSending(true);

    // Optimistic update — add message immediately
    const tempMsg = {
      id: Date.now(),
      customerId: selectedId,
      senderType: "admin",
      text: msgText,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    updateChats(chatsRef.current.map(c =>
      c.customerId === selectedId
        ? { ...c, messages: [...c.messages, tempMsg], lastMessage: tempMsg }
        : c
    ));

    setText("");
    try {
      await fetch("/api/chef/messages", {
        method: "POST",
        headers: chefHeaders(),
        body: JSON.stringify({ customerId: selectedId, text: msgText }),
      });
      // Refresh to get server-confirmed messages
      await fetchChats();
    } catch {}
    setSending(false);
  };

  const totalUnread = chats.reduce((s, c) => s + c.unreadCount, 0);

  // Conversation view
  if (selectedId !== null && selected) {
    return (
      <div className="flex flex-col" style={{ height: "calc(100vh - 145px)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur flex-none">
          <button onClick={() => selectCustomer(null)} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base flex-none">
            {(selected.customerName || selected.customerPhone || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{selected.customerName || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{selected.customerPhone}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {(selected.messages || []).length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">Hali xabarlar yo'q</div>
          ) : (
            (selected.messages || []).map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                  msg.senderType === "admin"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}>
                  <p className="leading-relaxed break-words">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.senderType === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-3 py-3 flex gap-2 bg-background flex-none">
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Javob yozing..."
            className="flex-1 rounded-2xl h-11"
            autoFocus
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            size="icon"
            className="rounded-2xl w-11 h-11 shrink-0"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </Button>
        </div>
      </div>
    );
  }

  // Chat list
  return (
    <div className="space-y-2">
      {loading ? (
        Array(3).fill(0).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
        ))
      ) : chats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Hozircha xabarlar yo'q</p>
        </div>
      ) : (
        chats.map(chat => (
          <motion.button
            key={chat.customerId}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => selectCustomer(chat.customerId)}
            className="w-full text-left bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-none">
                {(chat.customerName || chat.customerPhone || "?")[0].toUpperCase()}
              </div>
              {chat.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {chat.unreadCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{chat.customerName || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {chat.lastMessage?.senderType === "admin" ? "✓ " : ""}{chat.lastMessage?.text || chat.customerPhone}
              </p>
            </div>
            {chat.lastMessage && (
              <p className="text-xs text-muted-foreground flex-none">
                {new Date(chat.lastMessage.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </motion.button>
        ))
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChefPanel() {
  const [loggedIn, setLoggedIn] = useState(getChefSession());
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState<"orders" | "messages">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const intervalRef = useRef<any>(null);

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

  const fetchOrders = async () => {
    try {
      const r = await fetch("/api/chef/orders", { headers: chefHeaders() });
      if (r.ok) {
        const data: any[] = await r.json();
        const newIds = new Set(data.map((o: any) => o.id));
        const hasNew = data.some((o: any) => !prevOrderIdsRef.current.has(o.id));
        if (prevOrderIdsRef.current.size > 0 && hasNew) {
          playBeep();
          setNewOrderAlert(true);
          setTimeout(() => setNewOrderAlert(false), 5000);
        }
        prevOrderIdsRef.current = newIds;
        setOrders(data);
      }
    } catch {}
  };

  const fetchUnread = async () => {
    try {
      const r = await fetch("/api/chef/messages", { headers: { "x-chef-token": "chef-authenticated" } });
      if (r.ok) {
        const chats = await r.json();
        setUnreadCount(chats.reduce((s: number, c: any) => s + c.unreadCount, 0));
      }
    } catch {}
  };

  useEffect(() => {
    if (!loggedIn) return;
    fetchOrders();
    fetchUnread();
    intervalRef.current = setInterval(() => { fetchOrders(); fetchUnread(); }, 5000);
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
          <button onClick={() => { fetchOrders(); fetchUnread(); }} className="p-2 rounded-xl hover:bg-muted transition">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-600 text-white text-center py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2"
          >
            <span className="animate-bounce">🔔</span>
            Yangi buyurtma keldi!
            <span className="animate-bounce">🔔</span>
          </motion.div>
        )}
      </AnimatePresence>

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
          {unreadCount > 0 && (
            <span className="bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>
          )}
        </button>
      </div>

      <div className={tab === "messages" ? "" : "p-4 space-y-4 max-w-2xl mx-auto"}>
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

        {tab === "messages" && <ChefChat />}
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
    <motion.div layout className="bg-card rounded-2xl border border-border/50 overflow-hidden">
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
