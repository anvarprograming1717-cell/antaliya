import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Truck, Package, Check, LocateFixed, Loader2, Tag, X, Map } from "lucide-react";
import { useGetCart, getGetCartQueryKey, useCreateOrder, getListOrdersQueryKey, useApplyPromoCode, useGetMe, useGetDeliverySettings, getGetDeliverySettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getCustomerSession } from "@/lib/auth";

const MapPicker = lazy(() => import("@/components/MapPicker"));

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const session = getCustomerSession();

  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "online">("cash");
  const [address, setAddress] = useState("");
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Address suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Promo
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountAmount: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const { data: cartItems } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const { data: me } = useGetMe();
  const { data: deliverySettings } = useGetDeliverySettings({ query: { queryKey: getGetDeliverySettingsQueryKey() } });
  const DELIVERY_FEE_AMOUNT = deliverySettings?.deliveryFee ?? 15000;
  const FREE_THRESHOLD = deliverySettings?.freeDeliveryThreshold ?? 300000;
  const createOrder = useCreateOrder();
  const applyPromoCode = useApplyPromoCode();

  useEffect(() => {
    const serverAddr = (me as any)?.savedAddress;
    if (serverAddr && !address) setAddress(serverAddr);
  }, [me]);

  const subtotal = cartItems?.reduce((sum, item) => sum + (item.product.price as number) * item.quantity, 0) || 0;
  const deliveryFee = deliveryMethod === "delivery" && subtotal < FREE_THRESHOLD ? DELIVERY_FEE_AMOUNT : 0;
  const discount = promoApplied?.discountAmount || 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  // Address input change with suggestions
  const handleAddressChange = (val: string) => {
    setAddress(val);
    setAddressLat(null);
    setAddressLng(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim() || val.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&countrycodes=uz&accept-language=uz`,
          { headers: { "Accept-Language": "uz,ru,en" } }
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { setSuggestions([]); }
      finally { setSuggestLoading(false); }
    }, 450);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) { setLocateError("Brauzeringiz joylashuvni qo'llab-quvvatlamaydi"); return; }
    setLocating(true); setLocateError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setAddressLat(latitude); setAddressLng(longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=uz`,
            { headers: { "Accept-Language": "uz,ru,en" } }
          );
          const data = await res.json();
          setAddress(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } catch { setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`); }
        finally { setLocating(false); }
      },
      (err) => {
        setLocating(false);
        setLocateError(err.code === 1 ? "Joylashuvga ruxsat berilmadi." : "Joylashuvni aniqlab bo'lmadi.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleMapSelect = (addr: string, lat: number, lng: number) => {
    setAddress(addr); setAddressLat(lat); setAddressLng(lng);
    setShowMapPicker(false); setShowSuggestions(false);
  };

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) { setPromoError("Promokod kiriting"); return; }
    setPromoError(""); setPromoLoading(true);
    applyPromoCode.mutate(
      { data: { code, subtotal } },
      {
        onSuccess: (data: any) => {
          setPromoApplied({ code: data.promoCode, discountAmount: data.discountAmount });
          setPromoLoading(false);
        },
        onError: (e: any) => {
          setPromoError(e?.response?.data?.error || "Promokod noto'g'ri yoki muddati o'tgan");
          setPromoLoading(false);
        },
      }
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
          promoCode: promoApplied?.code,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          if (deliveryMethod === "delivery" && address && session?.id) {
            localStorage.setItem(`savedAddress_${session.id}`, address);
          }
          setLocation("/orders");
        },
      }
    );
  };

  return (
    <>
      {/* Map Picker Modal */}
      {showMapPicker && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
          <MapPicker
            initialAddress={address}
            onSelect={handleMapSelect}
            onClose={() => setShowMapPicker(false)}
          />
        </Suspense>
      )}

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
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">Manzil</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMapPicker(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 transition-all px-3 py-1.5 rounded-xl"
                    data-testid="button-map-picker"
                  >
                    <Map className="w-3.5 h-3.5" />
                    Xaritadan
                  </button>
                  <button
                    onClick={handleLocate}
                    disabled={locating}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-60 transition-all px-3 py-1.5 rounded-xl"
                    data-testid="button-locate"
                  >
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                    {locating ? "..." : "GPS"}
                  </button>
                </div>
              </div>

              {/* Address input with suggestions */}
              <div className="relative">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Textarea
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Shahar, ko'cha, uy raqami..."
                    className="pl-10 rounded-xl resize-none"
                    rows={2}
                    data-testid="input-address"
                  />
                  {suggestLoading && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={() => {
                          setAddress(s.display_name);
                          setAddressLat(parseFloat(s.lat));
                          setAddressLng(parseFloat(s.lon));
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 flex items-start gap-2 hover:bg-muted transition-colors border-b border-border/40 last:border-b-0"
                      >
                        <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm line-clamp-2">{s.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected from map indicator */}
              {addressLat && addressLng && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Koordinatalar: {addressLat.toFixed(5)}, {addressLng.toFixed(5)}</span>
                </div>
              )}

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
                  <p className="text-sm text-green-600 dark:text-green-400">-{promoApplied.discountAmount.toLocaleString()} so'm chegirma</p>
                </div>
                <button onClick={() => { setPromoApplied(null); setPromoInput(""); }} className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-800">
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
    </>
  );
}
