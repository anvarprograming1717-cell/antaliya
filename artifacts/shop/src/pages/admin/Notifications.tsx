import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Bell, Send, Check, Trash2, Image, X } from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";

const NKEY = ["/api/notifications"];

export default function Notifications() {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { data: notifications = [] } = useListNotifications({ query: { queryKey: NKEY, refetchInterval: 30000 } });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("message", message.trim());
      if (image) form.append("image", image);

      const res = await fetch("/api/notifications/send", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        setSent(true);
        setMessage("");
        removeImage();
        qc.invalidateQueries({ queryKey: NKEY });
        qc.refetchQueries({ queryKey: NKEY });
        setTimeout(() => setSent(false), 3000);
      }
    } catch {}
    setSending(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: NKEY });
    } catch {}
    setDeletingId(null);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Xabarnoma</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border/50 p-6 space-y-5"
      >
        <div>
          <h3 className="font-semibold mb-1">Barcha foydalanuvchilarga xabar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Xabar ilovada ko'rsatiladi. Rasm faqat Telegram botda ko'rinadi.
          </p>

          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Xabar matni..."
            className="rounded-xl resize-none min-h-[120px]"
            data-testid="input-notification-message"
          />

          {/* Image upload */}
          <div className="mt-3">
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="preview" className="h-32 w-auto rounded-xl object-cover border border-border" />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center text-white shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <p className="text-xs text-muted-foreground mt-1">📷 Bu rasm faqat Telegram botda ko'rinadi</p>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl px-4 py-2.5 transition-colors hover:border-primary/50"
              >
                <Image className="w-4 h-4" />
                Telegram uchun rasm qo'shish (ixtiyoriy)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {message && (
            <div className="mt-3 p-3 bg-muted/50 rounded-xl space-y-2">
              <p className="text-xs text-muted-foreground">Ko'rinishi (saytda):</p>
              {imagePreview && (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1">
                  📷 Rasm faqat Telegram botda ko'rinadi
                </div>
              )}
              <p className="text-sm font-semibold">🔔 Xabarnoma</p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className={`w-full h-12 rounded-xl ${sent ? "bg-green-600 hover:bg-green-600" : ""}`}
          data-testid="button-send-notification"
        >
          {sent ? (
            <><Check className="w-5 h-5 mr-2" /> Yuborildi!</>
          ) : sending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Yuborilmoqda...
            </div>
          ) : (
            <><Send className="w-5 h-5 mr-2" /> Yuborish</>
          )}
        </Button>
      </motion.div>

      {(notifications as any[]).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Yuborilgan xabarnomalar
          </h3>
          {(notifications as any[]).map((n: any, i: number) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-xl border border-border/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString("uz-UZ")}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  disabled={deletingId === n.id}
                  className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors flex-none disabled:opacity-50"
                  data-testid={`button-delete-notification-${n.id}`}
                >
                  {deletingId === n.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-destructive/50 border-t-destructive rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
