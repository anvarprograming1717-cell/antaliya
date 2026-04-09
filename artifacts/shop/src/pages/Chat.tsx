import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, ImageIcon, X, Trash2, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { useListMessages, getListMessagesQueryKey, useSendMessage, useClearMessages } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCustomerSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

function compressImage(file: File, maxWidth = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Chat() {
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const session = getCustomerSession();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useListMessages(
    { customerId: session?.id },
    { query: { queryKey: getListMessagesQueryKey({ customerId: session?.id }), refetchInterval: 5000 } }
  );

  const sendMessage = useSendMessage();
  const clearMessages = useClearMessages();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError("");
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { setMediaError("Faqat rasm yoki video"); return; }
    if (isVideo && file.size > 20 * 1024 * 1024) { setMediaError("Video 20MB dan oshmasin"); e.target.value = ""; return; }
    if (isImage) {
      try { setMediaPreview({ url: await compressImage(file), type: "image" }); }
      catch { setMediaError("Rasmni o'qib bo'lmadi"); }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setMediaPreview({ url: ev.target!.result as string, type: "video" });
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSend = () => {
    if ((!text.trim() && !mediaPreview) || !session) return;
    sendMessage.mutate(
      { data: { customerId: session.id, text: text.trim() || undefined, senderType: "customer", mediaUrl: mediaPreview?.url ?? undefined, mediaType: mediaPreview?.type ?? undefined } as any },
      {
        onSuccess: () => {
          setText("");
          setMediaPreview(null);
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey({ customerId: session.id }) });
        },
      }
    );
  };

  const handleClear = () => {
    if (!session) return;
    clearMessages.mutate(
      { params: { customerId: session.id } } as any,
      {
        onSuccess: () => {
          setShowClearConfirm(false);
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey({ customerId: session.id }) });
        },
      }
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3 flex items-center gap-3 flex-none">
        <button onClick={() => setLocation("/")} data-testid="button-back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Qo'llab-quvvatlash</h1>
          <p className="text-xs text-green-500">Online</p>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
          title="Chatni tozalash"
          data-testid="button-clear-chat"
        >
          <Trash2 className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Skeleton key={i} className="w-48 h-10 rounded-2xl" />)
        ) : messages && messages.length > 0 ? (
          messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex ${msg.senderType === "customer" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${msg.id}`}
            >
              <div className={`max-w-[80%] rounded-2xl overflow-hidden ${
                msg.senderType === "customer"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border/50 rounded-bl-md"
              }`}>
                {msg.mediaUrl && msg.mediaType === "image" && (
                  <img src={msg.mediaUrl} alt="Rasm" className="w-full max-w-[240px] object-cover" style={{ maxHeight: "280px" }} />
                )}
                {msg.mediaUrl && msg.mediaType === "video" && (
                  <video src={msg.mediaUrl} controls className="w-full max-w-[240px]" style={{ maxHeight: "280px" }} />
                )}
                {msg.text && (
                  <div className="px-4 py-2.5"><p className="text-sm">{msg.text}</p></div>
                )}
                <div className={`px-4 pb-2 ${msg.text ? "pt-0" : "pt-2"}`}>
                  <p className={`text-[10px] ${msg.senderType === "customer" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Savollaringizni yozing, admin tez orada javob beradi
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-none glass-panel border-t border-white/20 px-4 py-3 space-y-2">
        {mediaPreview && (
          <div className="relative inline-block">
            {mediaPreview.type === "image" ? (
              <img src={mediaPreview.url} alt="preview" className="h-20 w-auto rounded-xl object-cover border border-border" />
            ) : (
              <video src={mediaPreview.url} className="h-20 w-auto rounded-xl border border-border" />
            )}
            <button onClick={() => setMediaPreview(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center text-white shadow">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {mediaError && <p className="text-xs text-destructive">{mediaError}</p>}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center flex-none hover:bg-muted/70 transition-colors"
            data-testid="button-media"
          >
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Xabar yozing..."
            className="flex-1 rounded-2xl bg-muted/50 border-none h-12 text-base"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={(!text.trim() && !mediaPreview) || sendMessage.isPending}
            className="w-12 h-12 rounded-full p-0 flex-none"
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Clear Confirm Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h2 className="font-bold text-lg">Chatni tozalash</h2>
              </div>
              <p className="text-muted-foreground mb-5">Barcha xabarlarni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.</p>
              <div className="flex gap-3">
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleClear} disabled={clearMessages.isPending} data-testid="button-confirm-clear">
                  O'chirish
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowClearConfirm(false)}>
                  Bekor qilish
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
