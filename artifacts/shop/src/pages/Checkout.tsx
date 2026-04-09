import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, CreditCard, Truck, Package, Check, LocateFixed, Loader2 } from "lucide-react";
import { useGetCart, getGetCartQueryKey, useCreateOrder, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "online">("cash");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  const { data: cartItems } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const createOrder = useCreateOrder();

  const subtotal = cartItems?.reduce((sum, item) => sum + (item.product.price as number) * item.quantity, 0) || 0;
  const deliveryFee = deliveryMethod === "delivery" && subtotal < 300000 ? 15000 : 0;
  const total = subtotal + deliveryFee;

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

  const handleOrder = () => {
    createOrder.mutate(
      {
        data: {
          deliveryMethod,
          paymentMethod,
          address: deliveryMethod === "delivery" ? address : undefined,
          note: note || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
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
                {locating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5" />
                )}
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

            {locateError && (
              <p className="text-xs text-destructive">{locateError}</p>
            )}
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
