import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLoginCustomer, useSearchCustomer } from "@workspace/api-client-react";
import { setCustomerSession } from "@/lib/auth";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function getTelegramUserId(): string | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    const id = tg?.initDataUnsafe?.user?.id;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

async function linkTelegramId(customerId: number, telegramId: string) {
  try {
    await fetch("/api/customers/link-telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-customer-id": String(customerId),
      },
      body: JSON.stringify({ telegramId }),
    });
  } catch {}
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchCustomer = useSearchCustomer();
  const loginCustomer = useLoginCustomer();
  const telegramIdRef = useRef<string | null>(null);

  const [step, setStep] = useState<"phone" | "name">("phone");
  const [phone, setPhone] = useState("+998");
  const [name, setName] = useState("");

  useEffect(() => {
    telegramIdRef.current = getTelegramUserId();
    // Expand Telegram WebApp to full screen if inside bot
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.expand();
        tg.ready();
      }
    } catch {}
  }, []);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 13) {
      toast({ title: "Xato", description: "Telefon raqamni to'g'ri kiriting", variant: "destructive" });
      return;
    }

    searchCustomer.mutate(
      { data: { phone } },
      {
        onSuccess: async (data) => {
          if (data.exists && data.customer) {
            setCustomerSession(data.customer);
            if (telegramIdRef.current && !data.customer.telegramId) {
              await linkTelegramId(data.customer.id, telegramIdRef.current);
            }
            setLocation("/");
          } else {
            setStep("name");
          }
        },
        onError: () => {
          toast({ title: "Xato", description: "Xatolik yuz berdi", variant: "destructive" });
        }
      }
    );
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.length < 2) {
      toast({ title: "Xato", description: "Ismni kiriting", variant: "destructive" });
      return;
    }

    loginCustomer.mutate(
      { data: { phone, name } },
      {
        onSuccess: async (customer) => {
          setCustomerSession(customer);
          if (telegramIdRef.current) {
            await linkTelegramId(customer.id, telegramIdRef.current);
          }
          setLocation("/");
        },
        onError: () => {
          toast({ title: "Xato", description: "Ro'yxatdan o'tishda xatolik", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm glass-panel p-8 rounded-[2rem] text-center"
      >
        <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Xush kelibsiz</h1>
        <p className="text-muted-foreground mb-8">ShopUz tizimiga kirish</p>

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqam</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="h-12 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-md border-white/20 text-lg"
                data-testid="input-phone"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-lg font-medium"
              disabled={searchCustomer.isPending}
              data-testid="button-continue-phone"
            >
              {searchCustomer.isPending ? "Kuting..." : "Davom etish"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit} className="space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="name">Ismingiz</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ali"
                className="h-12 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-md border-white/20 text-lg"
                data-testid="input-name"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-lg font-medium"
              disabled={loginCustomer.isPending}
              data-testid="button-register"
            >
              {loginCustomer.isPending ? "Kuting..." : "Boshlash"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
