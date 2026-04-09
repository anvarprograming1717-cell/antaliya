import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Send, Check } from "lucide-react";
import { useSendNotification } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Notifications() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const sendNotification = useSendNotification();

  const handleSend = () => {
    if (!message.trim()) return;
    sendNotification.mutate(
      { data: { message } },
      {
        onSuccess: () => {
          setSent(true);
          setMessage("");
          setTimeout(() => setSent(false), 3000);
        },
      }
    );
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
          <p className="text-sm text-muted-foreground mb-4">Bu xabar Telegram bot orqali barcha ro'yxatdan o'tgan foydalanuvchilarga yuboriladi.</p>

          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Xabar matni..."
            className="rounded-xl resize-none min-h-[120px]"
            data-testid="input-notification-message"
          />

          {message && (
            <div className="mt-3 p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Ko'rinishi:</p>
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
    </div>
  );
}
