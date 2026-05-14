import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLoginCustomer, useSearchCustomer } from "@workspace/api-client-react";
import { setCustomerSession } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Loader2, Phone, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGetSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";

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
  const initDataRef = useRef<string | null>(null);
  const { data: siteSettings } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });

  const logoUrl = (siteSettings as any)?.logoUrl || null;
  const loginTitle = (siteSettings as any)?.loginTitle || "Xush kelibsiz";
  const loginSubtitle = (siteSettings as any)?.loginSubtitle || "ShopUz tizimiga kirish";

  const [step, setStep] = useState<"tg-loading" | "phone" | "name" | "tg-share" | "tg-polling">("phone");
  const [phone, setPhone] = useState("+998");
  const [name, setName] = useState("");
  const [tgContactError, setTgContactError] = useState("");
  const [pollingCount, setPollingCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if Telegram.WebApp.requestContact is available
  const isTelegramApp = !!(window as any).Telegram?.WebApp?.initData;
  const hasRequestContact = !!(window as any).Telegram?.WebApp?.requestContact;
  const hasSendData = !!(window as any).Telegram?.WebApp?.sendData;

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.expand();
      tg.ready();
    }

    const initData = tg?.initData;
    const telegramId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    telegramIdRef.current = telegramId;
    initDataRef.current = initData || null;

    if (!initData) return;

    // Auto-login via Telegram initData
    setStep("tg-loading");
    fetch("/api/customers/telegram-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.telegramId) telegramIdRef.current = String(data.telegramId);
        if (data.customer) {
          setCustomerSession(data.customer);
          setLocation("/");
        } else {
          if (data.suggestedName) setName(data.suggestedName);
          setStep("phone");
        }
      })
      .catch(() => {
        setStep("phone");
      });

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Polling for bot-based contact flow
  const startPolling = (telegramId: string) => {
    setStep("tg-polling");
    setPollingCount(0);
    let count = 0;
    pollingRef.current = setInterval(async () => {
      count++;
      setPollingCount(count);
      try {
        const res = await fetch(`/api/telegram/check-link?telegramId=${encodeURIComponent(telegramId)}`);
        const data = await res.json();
        if (data.linked && data.customer) {
          clearInterval(pollingRef.current!);
          setCustomerSession(data.customer);
          setLocation("/");
        }
      } catch {}
      // Stop polling after 3 minutes (36 × 5s)
      if (count >= 36) {
        clearInterval(pollingRef.current!);
        setStep("phone");
        toast({ title: "Vaqt tugadi", description: "Qayta urinib ko'ring", variant: "destructive" });
      }
    }, 5000);
  };

  // Primary: use Telegram.WebApp.requestContact()
  const handleRequestContact = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;
    setTgContactError("");

    tg.requestContact((status: string, response: any) => {
      if (status === "cancelled") {
        setTgContactError("Bekor qilindi. Telefon raqam bilan kirish ham mumkin.");
        return;
      }
      if (status !== "sent") {
        setTgContactError("Xatolik yuz berdi. Telefon raqam bilan kirish ham mumkin.");
        return;
      }

      // Get contact from response
      const contact = response?.responseUnsafe?.contact ?? response?.contact;
      const phoneNumber: string = contact?.phone_number ?? "";
      const fn: string = contact?.first_name ?? tg.initDataUnsafe?.user?.first_name ?? "";
      const ln: string = contact?.last_name ?? tg.initDataUnsafe?.user?.last_name ?? "";
      const tid: string = telegramIdRef.current ?? String(tg.initDataUnsafe?.user?.id ?? "");

      if (!phoneNumber && !tid) {
        setTgContactError("Telefon raqam olinmadi. Qo'lda kiriting.");
        return;
      }

      setStep("tg-loading");
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      fetch("/api/telegram/register-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber || undefined,
          firstName: fn,
          lastName: ln,
          telegramId: tid,
          username: tgUser?.username ?? null,
          initData: initDataRef.current,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.customer) {
            setCustomerSession(data.customer);
            setLocation("/");
          } else {
            setStep("phone");
            toast({ title: "Xatolik", description: data.error || "Qayta urinib ko'ring", variant: "destructive" });
          }
        })
        .catch(() => {
          setStep("phone");
          toast({ title: "Ulanish xatosi", description: "Qayta urinib ko'ring", variant: "destructive" });
        });
    });
  };

  // Fallback: use Telegram.WebApp.sendData() → bot sends contact keyboard → user shares → polling
  const handleSendDataFallback = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !telegramIdRef.current) return;

    try {
      tg.sendData("request_phone");
      // sendData closes the mini app. Start polling so when user reopens it auto-links.
      startPolling(telegramIdRef.current);
    } catch {
      setTgContactError("sendData xatosi. Bot chatiga o'ting va raqamingizni yuboring.");
    }
  };

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
            toast({ title: "Bu raqam ro'yxatdan o'tgan", description: "Tizimga kirilmoqda..." });
            setCustomerSession(data.customer);
            if (telegramIdRef.current) {
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
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="mx-auto w-28 h-28 rounded-2xl object-contain mb-6"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-8 h-8" />
          </div>
        )}
        <h1 className="text-2xl font-bold mb-2">{loginTitle}</h1>
        <p className="text-muted-foreground mb-8">{loginSubtitle}</p>

        <AnimatePresence mode="wait">
          {/* Loading state */}
          {(step === "tg-loading") && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Telegram orqali kirilmoqda...</p>
            </motion.div>
          )}

          {/* Polling state (waiting for bot contact share) */}
          {step === "tg-polling" && (
            <motion.div
              key="polling"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-left space-y-2">
                <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">📱 Bot chatiga o'ting</p>
                <ol className="text-xs text-blue-600 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Telegram botni oching</li>
                  <li>"📱 Telefon raqamni ulashish" tugmasini bosing</li>
                  <li>Ruxsat bering → avtomatik kirasiz</li>
                </ol>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Kutilmoqda... ({pollingCount * 5}s)</span>
              </div>
              <button
                onClick={() => {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  setStep("phone");
                }}
                className="text-xs text-muted-foreground underline"
              >
                Telefon raqam bilan kirish
              </button>
            </motion.div>
          )}

          {/* Phone step */}
          {step === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Telegram phone sharing button (only in Telegram WebApp) */}
              {isTelegramApp && (
                <div className="space-y-2">
                  <button
                    onClick={hasRequestContact ? handleRequestContact : handleSendDataFallback}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold h-12 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram orqali ro'yxatdan o'tish
                  </button>

                  {tgContactError && (
                    <p className="text-xs text-red-500 text-left">{tgContactError}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex-1 h-px bg-border" />
                    <span>yoki</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </div>
              )}

              <form onSubmit={handlePhoneSubmit} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon raqam</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val.startsWith("+998")) {
                        setPhone("+998");
                        return;
                      }
                      const digits = val.slice(4).replace(/\D/g, "").slice(0, 9);
                      setPhone("+998" + digits);
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === "Backspace" || e.key === "Delete") && phone === "+998") {
                        e.preventDefault();
                      }
                      const isDigit = /^\d$/.test(e.key);
                      const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key);
                      const digits = phone.slice(4);
                      if (!isDigit && !isControl) e.preventDefault();
                      if (isDigit && digits.length >= 9) e.preventDefault();
                    }}
                    inputMode="numeric"
                    placeholder="+998 90 123 45 67"
                    className="h-12 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-md border-white/20 text-lg"
                    data-testid="input-phone"
                    autoFocus={!isTelegramApp}
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
            </motion.div>
          )}

          {/* Name step */}
          {step === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
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
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="w-full text-sm text-muted-foreground"
                >
                  ← Orqaga
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Telegram info hint (outside mini app) */}
      {!isTelegramApp && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-xs text-muted-foreground text-center max-w-xs"
        >
          <Phone className="inline w-3 h-3 mr-1" />
          Telegram Mini App orqali kirgan foydalanuvchilar telefon raqamini avtomatik ulashishi mumkin
        </motion.p>
      )}
    </div>
  );
}
