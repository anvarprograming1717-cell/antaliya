import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck, Check, Info } from "lucide-react";
import { useGetDeliverySettings, getGetDeliverySettingsQueryKey, useUpdateDeliverySettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function ZoneClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function Delivery() {
  const queryClient = useQueryClient();
  const { data: settings } = useGetDeliverySettings({ query: { queryKey: getGetDeliverySettingsQueryKey() } });
  const updateSettings = useUpdateDeliverySettings();
  const [saved, setSaved] = useState(false);
  const [zoneSaved, setZoneSaved] = useState(false);
  const [zoneSaving, setZoneSaving] = useState(false);

  const [form, setForm] = useState({ deliveryFee: "", freeDeliveryThreshold: "", estimatedMinutes: "" });
  const [zone, setZone] = useState<{ lat: number | null; lng: number | null; radiusKm: number }>({ lat: null, lng: null, radiusKm: 5 });
  const mapRef = useRef<any>(null);

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
    fetch("/api/admin/delivery-zone").then(r => r.json()).then(d => {
      if (d.lat) {
        setZone({ lat: d.lat, lng: d.lng, radiusKm: d.radiusKm ?? 5 });
        setTimeout(() => mapRef.current?.flyTo([d.lat, d.lng], 12), 300);
      }
    }).catch(() => {});
  }, []);

  const handleSave = () => {
    updateSettings.mutate(
      { data: { deliveryFee: parseFloat(form.deliveryFee), freeDeliveryThreshold: parseFloat(form.freeDeliveryThreshold), estimatedMinutes: parseInt(form.estimatedMinutes) } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDeliverySettingsQueryKey() }); setSaved(true); setTimeout(() => setSaved(false), 2000); } }
    );
  };

  const handleSaveZone = async () => {
    if (!zone.lat || !zone.lng) return;
    setZoneSaving(true);
    try {
      await fetch("/api/admin/delivery-zone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: zone.lat, lng: zone.lng, radiusKm: zone.radiusKm }),
      });
      setZoneSaved(true);
      setTimeout(() => setZoneSaved(false), 2500);
    } catch {}
    setZoneSaving(false);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Truck className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Yetkazib berish</h1>
      </div>

      {/* Price settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
        <h3 className="font-bold">Narx sozlamalari</h3>
        <div>
          <label className="text-sm font-semibold block mb-1.5">Yetkazib berish narxi (so'm)</label>
          <Input type="number" value={form.deliveryFee} onChange={e => setForm(f => ({ ...f, deliveryFee: e.target.value }))} className="rounded-xl h-12" data-testid="input-delivery-fee" />
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1.5">Bepul yetkazish chegarasi (so'm)</label>
          <Input type="number" value={form.freeDeliveryThreshold} onChange={e => setForm(f => ({ ...f, freeDeliveryThreshold: e.target.value }))} className="rounded-xl h-12" data-testid="input-free-threshold" />
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1.5">Taxminiy yetkazish vaqti (daqiqa)</label>
          <Input type="number" value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: e.target.value }))} className="rounded-xl h-12" data-testid="input-estimated-minutes" />
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className={`w-full h-12 rounded-xl ${saved ? "bg-green-600 hover:bg-green-600" : ""}`} data-testid="button-save-delivery">
          {saved ? <><Check className="w-5 h-5 mr-2" />Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>

      {/* Delivery Zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <div>
          <h3 className="font-bold flex items-center gap-2">Yetkazib berish zonasi</h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            Xaritaga bosib markaz qo'ying, slider bilan radius belgilang. Doiradan tashqarida buyurtma berib bo'lmaydi.
          </p>
        </div>

        {/* Interactive map */}
        <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 320 }}>
          <MapContainer
            center={[zone.lat ?? 41.2995, zone.lng ?? 69.2401]}
            zoom={11}
            className="w-full h-full"
            ref={mapRef}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ZoneClickHandler onMapClick={(lat, lng) => setZone(z => ({ ...z, lat, lng }))} />
            {zone.lat && zone.lng && (
              <>
                <Marker position={[zone.lat, zone.lng]} />
                <Circle
                  center={[zone.lat, zone.lng]}
                  radius={zone.radiusKm * 1000}
                  pathOptions={{ color: "#4F46E5", fillColor: "#4F46E5", fillOpacity: 0.12, weight: 2 }}
                />
              </>
            )}
          </MapContainer>
        </div>

        {!zone.lat && (
          <p className="text-center text-sm text-muted-foreground">Xaritaga bosing — markaz o'rnatiladi</p>
        )}

        {zone.lat && zone.lng && (
          <div className="bg-primary/5 rounded-xl px-3 py-2 text-xs text-primary font-medium">
            Markaz: {zone.lat.toFixed(5)}, {zone.lng.toFixed(5)}
          </div>
        )}

        {/* Radius slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Radius</label>
            <span className="text-sm font-bold text-primary">{zone.radiusKm} km</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="30"
            step="0.5"
            value={zone.radiusKm}
            onChange={e => setZone(z => ({ ...z, radiusKm: parseFloat(e.target.value) }))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5 km</span>
            <span>30 km</span>
          </div>
        </div>

        <Button
          onClick={handleSaveZone}
          disabled={zoneSaving || !zone.lat || !zone.lng}
          className={`w-full rounded-xl ${zoneSaved ? "bg-green-600 hover:bg-green-600" : ""}`}
        >
          {zoneSaved ? <><Check className="w-4 h-4 mr-2" />Saqlandi!</> : "Zonani saqlash"}
        </Button>
      </motion.div>
    </div>
  );
}
