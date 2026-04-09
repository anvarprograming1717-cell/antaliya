import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, CreditCard, Truck, Package, Check, LocateFixed, Loader2, Tag, X } from "lucide-react";
import { useGetCart, getGetCartQueryKey, useCreateOrder, getListOrdersQueryKey, useApplyPromoCode, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getCustomerSession } from "@/lib/auth";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const session = getCustomerSession();

  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "online">("cash");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountAmount: number; discountType: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const { data: cartItems } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const { data: me } = useGetMe();
  const createOrder = useCreateOrder();
  const applyPromoCode = useApplyPromoCode();

  // Auto-fill saved address from server
  useEffect(() => {
    const serverAddr = (me as any)?.savedAddress;
    if (serverAddr && !address) {
      setAddress(serverAddr);
    }
  }, [me]);

  const subtotal = cartItems?.reduce((sum, item) => sum + (item.product.price as number) * item.quantity, 0) || 0;
  const deliveryFee = deliveryMethod === "delivery" && subtotal < 300000 ? 15000 : 0;
  const discount = promoApplied?.discountAmount || 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateError("Brauzeringiz joylashuvni qo'llab-quvvatlamaydi");
      return;
    }
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=uz`,
            { headers: { "Accept-Language": "uz,ru,en" } }
          );
          const data = await res.json();
          const addr = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setAddress(addr);
        } catch {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocateError("Joylashuvga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.");
        } else {
          setLocateError("Joylashuvni aniqlab bo'lmadi. Qaytadan urinib ko'ring.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) { setPromoError("Promokod kiriting"); return; }
    setPromoError("");
    setPromoLoading(true);
    applyPromoCode.mutate(
      { data: { code, subtotal } },
      {
        onSuccess: (data: any) => {
          setPromoApplied({ code: data.promoCode, discountAmount: data.discountAmount, discountType: data.discountType });
          setPromoLoading(false);
        },
        onError: (e: any) => {
          const msg = e?.response?.data?.error || "Promokod noto'g'ri yoki muddati o'tgan";
          setPromoError(msg);
          setPromoLoading(false);
        },
      }
    );
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoInput("");
    setPromoError("");
  };

  const handleOrder = () => {
    createOrder.mutate(
      {
        data: {
          deliveryMethod,
          paymentMethod,
          address: deliveryMethod === "delivery" ? address : undefined,
          note: note || undefined,
          promoCode: promoApplied?.code,
        },
      },
      {
        onSuccess: (order: any) => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          // Cache saved address locally
          if (deliveryMethod === "delivery" && address && session?.id) {
            localStorage.setItem(`savedAddress_${session.id}`, address);
          }
          setLocation("/orders");
        },
      }
    );
  };

  return (
    <div className="min-h-screen pb-6">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation("/cart")} data-testid="button-back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Buyurtma berish</h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Delivery Method */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <h3 className="font-bold mb-3">Yetkazib berish usuli</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "delivery", icon: Truck, label: "Yetkazib berish" },
              { value: "pickup", icon: Package, label: "Olib ketish" },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setDeliveryMethod(value as any)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${deliveryMethod === value ? "border-primary bg-primary/5" : "border-border"}`}
                data-testid={`button-delivery-${value}`}
              >
                <Icon className={`w-6 h-6 ${deliveryMethod === value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${deliveryMethod === value ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        {deliveryMethod === "delivery" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-card rounded-2xl p-4 border border-border/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Manzil</h3>
              <button
                onClick={handleLocate}
                disabled={locating}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-60 transition-all px-3 py-1.5 rounded-xl"
                data-testid="button-locate"
              >
                {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                {locating ? "Aniqlanmoqda..." : "Joylashuvni aniqlash"}
              </button>
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="To'liq manzilni kiriting yoki joylashuvni aniqlang..."
                className="pl-10 rounded-xl resize-none"
                rows={3}
                data-testid="input-address"
              />
            </div>

            {locateError && <p className="text-xs text-destructive">{locateError}</p>}
          </motion.div>
        )}

        {/* Payment Method */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <h3 className="font-bold mb-3">To'lov usuli</h3>
          <div className="space-y-2">
            {[
              { value: "cash", label: "Naqd pul" },
              { value: "card", label: "Karta" },
              { value: "online", label: "Online to'lov" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPaymentMethod(value as any)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${paymentMethod === value ? "border-primary bg-primary/5" : "border-border"}`}
                data-testid={`button-payment-${value}`}
              >
                <span className={`font-medium text-sm ${paymentMethod === value ? "text-primary" : ""}`}>{label}</span>
                {paymentMethod === value && <Check className="w-5 h-5 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Promo Code */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Promokod
          </h3>
          {promoApplied ? (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3">
              <div>
                <p className="font-mono font-bold text-green-700 dark:text-green-400">{promoApplied.code}</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  -{promoApplied.discountAmount.toLocaleString()} so'm chegirma
                </p>
              </div>
              <button onClick={handleRemovePromo} className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors">
                <X className="w-4 h-4 text-green-700 dark:text-green-400" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                placeholder="PROMOKOD"
                className="rounded-xl font-mono flex-1"
                onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                data-testid="input-promo-code"
              />
              <Button
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoInput.trim()}
                variant="outline"
                className="rounded-xl px-4"
                data-testid="button-apply-promo"
              >
                {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Qo'llash"}
              </Button>
            </div>
          )}
          {promoError && <p className="text-xs text-destructive mt-2">{promoError}</p>}
        </div>

        {/* Note */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <h3 className="font-bold mb-3">Izoh (ixtiyoriy)</h3>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Yetkazib beruvchi uchun izoh..."
            className="rounded-xl resize-none"
            rows={2}
            data-testid="input-note"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mahsulotlar ({cartItems?.length || 0})</span>
            <span>{subtotal.toLocaleString()} so'm</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Yetkazib berish</span>
            <span>{deliveryFee === 0 ? "Bepul" : `${deliveryFee.toLocaleString()} so'm`}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Chegirma ({promoApplied?.code})</span>
              <span>-{discount.toLocaleString()} so'm</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Jami</span>
            <span className="text-primary">{total.toLocaleString()} so'm</span>
          </div>
        </div>

        <Button
          onClick={handleOrder}
          disabled={createOrder.isPending || (deliveryMethod === "delivery" && !address.trim())}
          className="w-full h-14 rounded-2xl text-base font-semibold"
          data-testid="button-place-order"
        >
          {createOrder.isPending ? "Buyurtma berilmoqda..." : `Buyurtma berish — ${total.toLocaleString()} so'm`}
        </Button>
      </div>
    </div>
  );
}
