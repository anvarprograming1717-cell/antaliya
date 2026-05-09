import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Edit2, Trash2, MapPin, Eye, EyeOff, X, Check, Navigation,
  Navigation2
} from "lucide-react";
import {
  useListCouriers, getListCouriersQueryKey,
  useCreateCourier, useUpdateCourier, useDeleteCourier,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function CourierMapModal({ courier, onClose }: { courier: any; onClose: () => void }) {
  const lat = courier.lat;
  const lng = courier.lng;
  const hasLocation = lat && lng;
  const mapUrl = hasLocation
    ? `https://yandex.uz/map-widget/v1/?ll=${lng},${lat}&pt=${lng},${lat},pm2rdl&z=16&l=map`
    : null;
  const updatedAt = courier.locationUpdatedAt
    ? new Date(courier.locationUpdatedAt).toLocaleString("uz-UZ")
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-3xl p-5 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">{courier.name}</h2>
            {updatedAt && <p className="text-xs text-muted-foreground">Yangilangan: {updatedAt}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        {hasLocation ? (
          <>
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <Navigation className="w-4 h-4" />
              <span className="text-sm font-semibold">Faol joylashuv mavjud</span>
            </div>
            <iframe
              src={mapUrl!}
              width="100%"
              height="300"
              className="rounded-2xl border border-border"
              allowFullScreen
              title="Kuryer joylashuvi"
            />
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Navigation2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Kuryer joylashuvini ulashmagan</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

const emptyForm = { name: "", phone: "", username: "", password: "", telegramId: "", isActive: true };

export default function AdminCouriers() {
  const qc = useQueryClient();
  const { data: couriers, isLoading } = useListCouriers({ query: { queryKey: getListCouriersQueryKey() } });
  const createCourier = useCreateCourier();
  const updateCourier = useUpdateCourier();
  const deleteCourier = useDeleteCourier();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [mapCourier, setMapCourier] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => { setForm(emptyForm); setEditId(null); setShowForm(false); setError(""); };

  const handleEdit = (c: any) => {
    setForm({ name: c.name, phone: c.phone, username: c.username, password: "", telegramId: c.telegramId || "", isActive: c.isActive });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    setError("");
    if (!form.name || !form.phone || !form.username) {
      setError("Ism, telefon va username majburiy");
      return;
    }
    if (!editId && !form.password) {
      setError("Parol majburiy");
      return;
    }
    if (editId) {
      const data: any = { name: form.name, phone: form.phone, username: form.username, isActive: form.isActive, telegramId: form.telegramId || null };
      if (form.password) data.password = form.password;
      updateCourier.mutate(
        { id: editId, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/couriers"] });
            qc.refetchQueries({ queryKey: ["/api/couriers"] });
            resetForm();
          }
        }
      );
    } else {
      createCourier.mutate(
        { data: { name: form.name, phone: form.phone, username: form.username, password: form.password, isActive: form.isActive, telegramId: form.telegramId || undefined } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/couriers"] });
            qc.refetchQueries({ queryKey: ["/api/couriers"] });
            resetForm();
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteCourier.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/couriers"] });
          qc.refetchQueries({ queryKey: ["/api/couriers"] });
          setDeleteId(null);
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kuryerlar</h1>
        <Button onClick={() => setShowForm(true)} className="rounded-xl gap-2" data-testid="button-add-courier">
          <Plus className="w-4 h-4" />
          Qo'shish
        </Button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-2xl p-5 space-y-3"
          >
            <h2 className="font-bold">{editId ? "Tahrirlash" : "Yangi kuryer"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ism" className="rounded-xl" />
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Telefon" className="rounded-xl" />
              <Input value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username (login)" className="rounded-xl" />
              <div className="relative">
                <Input
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  type={showPassword ? "text" : "password"}
                  placeholder={editId ? "Yangi parol (ixtiyoriy)" : "Parol"}
                  className="rounded-xl pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                value={form.telegramId}
                onChange={(e) => setForm(f => ({ ...f, telegramId: e.target.value }))}
                placeholder="Telegram ID (ixtiyoriy)"
                className="rounded-xl col-span-2"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-1">Telegram ID — kuryer tayinlanganda habar yuborish uchun. Kuryerdan /start yuboritib, ID raqamini oling.</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm font-medium">Faol (ishlayapti)</span>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createCourier.isPending || updateCourier.isPending} className="rounded-xl gap-2">
                <Check className="w-4 h-4" />
                {editId ? "Saqlash" : "Qo'shish"}
              </Button>
              <Button variant="outline" onClick={resetForm} className="rounded-xl gap-2">
                <X className="w-4 h-4" />
                Bekor qilish
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : couriers && couriers.length > 0 ? (
        <div className="space-y-3">
          {couriers.map((courier) => (
            <motion.div
              key={courier.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border border-border rounded-2xl p-4"
              data-testid={`courier-${courier.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{courier.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${courier.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {courier.isActive ? "Faol" : "Nofaol"}
                    </span>
                    {(courier.lat && courier.lng) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        GPS faol
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{courier.phone} · @{courier.username}</p>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button
                    onClick={() => setMapCourier(courier)}
                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                    title="Xaritada ko'rish"
                    data-testid={`button-map-${courier.id}`}
                  >
                    <MapPin className="w-4 h-4 text-primary" />
                  </button>
                  <button
                    onClick={() => handleEdit(courier)}
                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                    data-testid={`button-edit-${courier.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(courier.id)}
                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    data-testid={`button-delete-${courier.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Navigation2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Kuryerlar yo'q</p>
          <p className="text-sm mt-1">Birinchi kuryerni qo'shing</p>
        </div>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h2 className="font-bold text-lg mb-2">O'chirishni tasdiqlash</h2>
              <p className="text-muted-foreground mb-5">Bu kuryerni o'chirishni xohlaysizmi?</p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleteCourier.isPending}
                >
                  O'chirish
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteId(null)}>
                  Bekor qilish
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Map Modal */}
      <AnimatePresence>
        {mapCourier && <CourierMapModal courier={mapCourier} onClose={() => setMapCourier(null)} />}
      </AnimatePresence>
    </div>
  );
}
