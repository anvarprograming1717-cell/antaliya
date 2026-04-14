import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MessageCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatItem {
  customerId: number;
  customerName: string;
  customerPhone: string;
  unreadCount: number;
  lastMessage: any;
  messages: any[];
}

export default function AdminChat() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/messages");
      if (r.ok) setChats(await r.json());
    } catch {}
    setChatsLoading(false);
  }, []);

  const fetchMessages = useCallback(async (customerId: number) => {
    setMessagesLoading(true);
    try {
      const r = await fetch(`/api/messages?customerId=${customerId}`);
      if (r.ok) setMessages(await r.json());
    } catch {}
    setMessagesLoading(false);
  }, []);

  useEffect(() => {
    fetchChats();
    intervalRef.current = setInterval(fetchChats, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchChats]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    fetchMessages(selectedCustomerId);
    const t = setInterval(() => fetchMessages(selectedCustomerId), 5000);
    return () => clearInterval(t);
  }, [selectedCustomerId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !selectedCustomerId || sending) return;
    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selectedCustomerId, text: text.trim(), senderType: "admin" }),
      });
      setText("");
      fetchMessages(selectedCustomerId);
      fetchChats();
    } catch {}
    setSending(false);
  };

  const handleDeleteChat = async (customerId: number) => {
    setDeletingId(customerId);
    try {
      await fetch(`/api/admin/messages/${customerId}`, { method: "DELETE" });
      setChats(prev => prev.filter(c => c.customerId !== customerId));
      if (selectedCustomerId === customerId) {
        setSelectedCustomerId(null);
        setMessages([]);
      }
    } catch {}
    setDeletingId(null);
    setConfirmDelete(null);
  };

  const selectedChat = chats.find(c => c.customerId === selectedCustomerId);

  return (
    <div className="space-y-0 h-[calc(100vh-10rem)]">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>

      <div className="flex gap-4 h-full">
        {/* Chat ro'yxati */}
        <div className="w-64 bg-card rounded-2xl border border-border/50 flex flex-col overflow-hidden flex-none">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-semibold text-muted-foreground">Mijozlar ({chats.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatsLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="m-2 h-14 rounded-xl" />)
            ) : chats.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8 px-3">Hali xabarlar yo'q</div>
            ) : chats.map(c => (
              <div
                key={c.customerId}
                className={`flex items-center gap-2 hover:bg-muted/40 transition-colors ${selectedCustomerId === c.customerId ? "bg-primary/10" : ""}`}
              >
                <button
                  onClick={() => setSelectedCustomerId(c.customerId)}
                  className="flex-1 text-left px-3 py-3 flex items-center gap-3 min-w-0"
                  data-testid={`customer-tab-${c.customerId}`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-none">
                      {(c.customerName || c.customerPhone || "?")[0].toUpperCase()}
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedCustomerId === c.customerId ? "text-primary" : ""}`}>{c.customerName || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage?.text || c.customerPhone}</p>
                  </div>
                </button>
                {confirmDelete === c.customerId ? (
                  <div className="flex gap-1 pr-2">
                    <button
                      onClick={() => handleDeleteChat(c.customerId)}
                      disabled={deletingId === c.customerId}
                      className="text-[10px] bg-destructive text-white px-1.5 py-0.5 rounded font-medium"
                      data-testid={`button-confirm-delete-chat-${c.customerId}`}
                    >Ha</button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium"
                    >Yo'q</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(c.customerId)}
                    className="mr-2 w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-none"
                    data-testid={`button-delete-chat-${c.customerId}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat maydoni */}
        <div className="flex-1 bg-card rounded-2xl border border-border/50 flex flex-col overflow-hidden">
          {selectedCustomerId ? (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                  {(selectedChat?.customerName || selectedChat?.customerPhone || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{selectedChat?.customerName || "—"}</p>
                  <p className="text-xs text-muted-foreground">{selectedChat?.customerPhone}</p>
                </div>
                {confirmDelete === selectedCustomerId ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-destructive">O'chirishmi?</span>
                    <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => handleDeleteChat(selectedCustomerId)}>Ha</Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(null)}>Yo'q</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(selectedCustomerId)}
                    className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    data-testid="button-delete-chat-header"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="w-48 h-10 rounded-2xl" />)
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.senderType === "admin"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}>
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${msg.senderType === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && !messagesLoading && (
                  <div className="text-center text-muted-foreground text-sm py-8">Hali xabarlar yo'q</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border px-4 py-3 flex gap-3">
                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Xabar yozing..."
                  className="flex-1 rounded-xl"
                  data-testid="input-message"
                />
                <Button onClick={handleSend} disabled={!text.trim() || sending} className="rounded-xl" data-testid="button-send">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Mijozni tanlang</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
