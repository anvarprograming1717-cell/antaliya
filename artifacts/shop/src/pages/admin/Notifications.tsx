import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Send, Check, Trash2 } from "lucide-react";
import { useSendNotification, useListNotifications } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";

const NKEY = ["/api/notifications"];

export default function Notifications() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const qc = useQueryClient();
  const sendNotification = useSendNotification();
  const { data: notifications = [] } = useListNotifications({ query: { queryKey: NKEY, refetchInterval: 30000 } });

  const handleSend = () => {
    if (!message.trim()) return;
    sendNotification.mutate(
      { data: { message } },
      {
        onSuccess: () => {
          setSent(true);
          setMessage("");
          qc.invalidateQueries({ queryKey: NKEY });
          qc.refetchQueries({ queryKey: NKEY });
          setTimeout(() => setSent(false), 3000);
        },
      }
    );
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
            Bu xabar ilovada barcha foydalanuvchilarga ko'rsatiladi.
            {" "}Telegram bot ulangan bo'lsa, Telegram'da ham <b>Assalomu aleykum!</b> bilan yuboriladi.
          </p>

          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Xabar matni..."
            className="rounded-xl resize-none min-h-[120px]"
            data-testid="input-notification-message"
          />

          {message && (
            <div className="mt-3 p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Ko'rinishi (Telegram):</p>
              <p className="text-sm font-semibold mb-1">🔔 Assalomu aleykum!</p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || sendNotification.isPending}
          className={`w-full h-12 rounded-xl ${sent ? "bg-green-600 hover:bg-green-600" : ""}`}
          data-testid="button-send-notification"
        >
          {sent ? (
            <><Check className="w-5 h-5 mr-2" /> Yuborildi!</>
          ) : (
            <><Send className="w-5 h-5 mr-2" /> Yuborish</>
          )}
        </Button>
      </motion.div>

      {/* Yuborilgan xabarnomalar tarixi */}
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
