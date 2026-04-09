import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Check } from "lucide-react";
import { useGetDeliverySettings, getGetDeliverySettingsQueryKey, useUpdateDeliverySettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Delivery() {
  const queryClient = useQueryClient();
  const { data: settings } = useGetDeliverySettings({ query: { queryKey: getGetDeliverySettingsQueryKey() } });
  const updateSettings = useUpdateDeliverySettings();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({ deliveryFee: "", freeDeliveryThreshold: "", estimatedMinutes: "" });

  useEffect(() => {
    if (settings) {
      setForm({
        deliveryFee: String(settings.deliveryFee),
        freeDeliveryThreshold: String(settings.freeDeliveryThreshold),
        estimatedMinutes: String(settings.estimatedMinutes),
      });
    }
  }, [settings]);

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
    </div>
  );
}
