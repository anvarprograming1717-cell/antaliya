import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useListMessages, getListMessagesQueryKey, useSendMessage } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCustomerSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function Chat() {
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const session = getCustomerSession();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useListMessages(
    { customerId: session?.id },
    { query: { queryKey: getListMessagesQueryKey({ customerId: session?.id }), refetchInterval: 5000 } }
  );

  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !session) return;
    sendMessage.mutate(
      { data: { customerId: session.id, text: text.trim(), senderType: "customer" } },
      {
        onSuccess: () => {
          setText("");
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey({ customerId: session.id }) });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation("/")} data-testid="button-back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Qo'llab-quvvatlash</h1>
          <p className="text-xs text-green-500">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.senderType === "customer"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border/50 rounded-bl-md"
              }`}>
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.senderType === "customer" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                </p>
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

      <div className="sticky bottom-0 glass-panel border-t border-white/20 px-4 py-3 flex gap-3 pb-safe">
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
          disabled={!text.trim() || sendMessage.isPending}
          className="w-12 h-12 rounded-full p-0 flex-none"
          data-testid="button-send"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
