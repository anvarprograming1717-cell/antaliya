import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Check, MapPin, Circle } from "lucide-react";
import { useGetDeliverySettings, getGetDeliverySettingsQueryKey, useUpdateDeliverySettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Delivery() {
  const queryClient = useQueryClient();
  const { data: settings } = useGetDeliverySettings({ query: { queryKey: getGetDeliverySettingsQueryKey() } });
  const updateSettings = useUpdateDeliverySettings();
  const [saved, setSaved] = useState(false);
  const [zoneSaved, setZoneSaved] = useState(false);
  const [zoneSaving, setZoneSaving] = useState(false);

  const [form, setForm] = useState({ deliveryFee: "", freeDeliveryThreshold: "", estimatedMinutes: "" });
  const [zone, setZone] = useState({ lat: "", lng: "", radiusKm: "5" });

  useEffect(() => {
    if (settings) {
      setForm({
        deliveryFee: String(settings.deliveryFee),
        freeDeliveryThreshold: String(settings.freeDeliveryThreshold),
        estimatedMinutes: String(settings.estimatedMinutes),
      });
    }
  }, [settings]);

  useEffect(() => {
    fetch("/api/admin/delivery-zone")
      .then(r => r.json())
      .then(d => {
        if (d.lat) setZone({ lat: String(d.lat), lng: String(d.lng), radiusKm: String(d.radiusKm ?? 5) });
      })
      .catch(() => {});
  }, []);

  const handleSave = () => {
    updateSettings.mutate(
      {
        data: {
          deliveryFee: parseFloat(form.deliveryFee),
          freeDeliveryThreshold: parseFloat(form.freeDeliveryThreshold),
          estimatedMinutes: parseInt(form.estimatedMinutes),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDeliverySettingsQueryKey() });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  const handleSaveZone = async () => {
    if (!zone.lat || !zone.lng) { alert("Koordinatalarni kiriting!"); return; }
    setZoneSaving(true);
    try {
      await fetch("/api/admin/delivery-zone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: parseFloat(zone.lat),
          lng: parseFloat(zone.lng),
          radiusKm: parseFloat(zone.radiusKm) || 5,
        }),
      });
      setZoneSaved(true);
      setTimeout(() => setZoneSaved(false), 2000);
    } catch {}
    setZoneSaving(false);
  };

  const mapUrl = zone.lat && zone.lng
    ? `https://yandex.uz/map-widget/v1/?ll=${zone.lng},${zone.lat}&pt=${zone.lng},${zone.lat},pm2rdl&z=14&l=map`
    : null;

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Truck className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Yetkazib berish</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border/50 p-6 space-y-5"
      >
        <h3 className="font-bold">Narx sozlamalari</h3>
        <div>
          <label className="text-sm font-semibold block mb-1.5">Yetkazib berish narxi (so'm)</label>
          <Input
            type="number"
            value={form.deliveryFee}
            onChange={e => setForm(f => ({ ...f, deliveryFee: e.target.value }))}
            className="rounded-xl h-12"
            data-testid="input-delivery-fee"
          />
          <p className="text-xs text-muted-foreground mt-1">Buyurtma ushbu summadan kam bo'lsa qo'shiladi</p>
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1.5">Bepul yetkazish chegarasi (so'm)</label>
          <Input
            type="number"
            value={form.freeDeliveryThreshold}
            onChange={e => setForm(f => ({ ...f, freeDeliveryThreshold: e.target.value }))}
            className="rounded-xl h-12"
            data-testid="input-free-threshold"
          />
          <p className="text-xs text-muted-foreground mt-1">Bu summadan yuqori buyurtmalarga yetkazib berish bepul</p>
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1.5">Taxminiy yetkazish vaqti (daqiqa)</label>
          <Input
            type="number"
            value={form.estimatedMinutes}
            onChange={e => setForm(f => ({ ...f, estimatedMinutes: e.target.value }))}
            className="rounded-xl h-12"
            data-testid="input-estimated-minutes"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className={`w-full h-12 rounded-xl ${saved ? "bg-green-600 hover:bg-green-600" : ""}`}
          data-testid="button-save-delivery"
        >
          {saved ? <><Check className="w-5 h-5 mr-2" /> Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>

      {/* Delivery Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card rounded-2xl border border-border/50 p-6 space-y-4"
      >
        <h3 className="font-bold flex items-center gap-2">
          <Circle className="w-4 h-4 text-primary" /> Yetkazib berish zonasi
        </h3>
        <p className="text-xs text-muted-foreground">
          Yetkazib beriladigan hududning markazini va radiusini kiriting. Foydalanuvchilar faqat shu doira ichida buyurtma bera oladi.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Kenglik (lat)</label>
            <Input
              type="number"
              step="0.0001"
              value={zone.lat}
              onChange={e => setZone(z => ({ ...z, lat: e.target.value }))}
              className="rounded-xl"
              placeholder="41.2995"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Uzunlik (lng)</label>
            <Input
              type="number"
              step="0.0001"
              value={zone.lng}
              onChange={e => setZone(z => ({ ...z, lng: e.target.value }))}
              className="rounded-xl"
              placeholder="69.2401"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Radius (km)</label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            value={zone.radiusKm}
            onChange={e => setZone(z => ({ ...z, radiusKm: e.target.value }))}
            className="rounded-xl"
            placeholder="5"
          />
          <p className="text-xs text-muted-foreground mt-1">Shu radiusdan tashqarida buyurtma qabul qilinmaydi</p>
        </div>

        {mapUrl ? (
          <div className="rounded-2xl overflow-hidden border border-border">
            <iframe
              src={mapUrl}
              width="100%"
              height="240"
              allowFullScreen
              title="Yetkazib berish zonasi"
              className="block"
            />
            <div className="bg-muted/30 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              Markaz: {zone.lat}, {zone.lng} · Radius: {zone.radiusKm} km
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border h-28 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
              <p className="text-sm">Koordinatalarni kiriting, xarita ko'rinadi</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleSaveZone}
          disabled={zoneSaving || !zone.lat || !zone.lng}
          className={`w-full rounded-xl ${zoneSaved ? "bg-green-600 hover:bg-green-600" : ""}`}
        >
          {zoneSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Zonani saqlash"}
        </Button>
      </motion.div>
    </div>
  );
}
