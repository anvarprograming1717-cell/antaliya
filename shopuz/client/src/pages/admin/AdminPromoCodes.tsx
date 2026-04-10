import { useState } from "react";
import { motion } from "framer-motion";
import { Tag, Plus, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight } from "lucide-react";
import {
  useListPromoCodes, useCreatePromoCode, useDeletePromoCode, useUpdatePromoCode,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const QKEY = ["/api/promo-codes"];

type Form = {
  code: string;
  discountType: "fixed" | "percent";
  discountAmount: string;
  maxUses: string;
  isActive: boolean;
};

const emptyForm: Form = {
  code: "",
  discountType: "fixed",
  discountAmount: "",
  maxUses: "",
  isActive: true,
};

export default function AdminPromoCodes() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: codes = [], isLoading } = useListPromoCodes({ query: { queryKey: QKEY } });
  const createCode = useCreatePromoCode();
  const updateCode = useUpdatePromoCode();
  const deleteCode = useDeletePromoCode();

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditId(null);
    setError("");
  };

  const handleEdit = (c: any) => {
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountAmount: String(c.discountAmount),
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      isActive: c.isActive,
    });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    setError("");
    const code = form.code.trim().toUpperCase();
    if (!code) { setError("Promokod nomi majburiy"); return; }
    if (!form.discountAmount || isNaN(Number(form.discountAmount)) || Number(form.discountAmount) <= 0) {
      setError("To'g'ri chegirma miqdori kiriting"); return;
    }
    const body = {
      code,
      discountType: form.discountType,
      discountAmount: Number(form.discountAmount),
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
      isActive: form.isActive,
    };
    if (editId) {
      updateCode.mutate({ id: editId, data: body }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: QKEY }); qc.refetchQueries({ queryKey: QKEY }); resetForm(); },
        onError: (e: any) => setError(e?.response?.data?.error || "Xatolik yuz berdi"),
      });
    } else {
      createCode.mutate({ data: body }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: QKEY }); qc.refetchQueries({ queryKey: QKEY }); resetForm(); },
        onError: (e: any) => setError(e?.response?.data?.error || "Bu promokod allaqachon mavjud"),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteCode.mutate({ id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: QKEY }); qc.refetchQueries({ queryKey: QKEY }); setDeleteId(null); },
    });
  };

  const handleToggle = (c: any) => {
    updateCode.mutate({ id: c.id, data: { isActive: !c.isActive } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: QKEY }); qc.refetchQueries({ queryKey: QKEY }); },
    });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Promokodlar</h1>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Qo'shish
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5 space-y-4"
        >
          <h3 className="font-bold">{editId ? "Tahrirlash" : "Yangi promokod"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Promokod *</label>
              <Input
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
                className="rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Chegirma turi</label>
              <div className="flex gap-2">
                {[{ v: "fixed", l: "So'm" }, { v: "percent", l: "%" }].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setForm(p => ({ ...p, discountType: o.v as any }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${form.discountType === o.v ? "border-primary bg-primary/5 text-primary" : "border-border"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Miqdor {form.discountType === "fixed" ? "(so'm)" : "(%)"} *
              </label>
              <Input
                type="number"
                value={form.discountAmount}
                onChange={e => setForm(p => ({ ...p, discountAmount: e.target.value }))}
                placeholder={form.discountType === "fixed" ? "10000" : "15"}
                className="rounded-xl"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Maksimal foydalanish (bo'sh = cheksiz)</label>
              <Input
                type="number"
                value={form.maxUses}
                onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))}
                placeholder="100"
                className="rounded-xl"
                min="1"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Faol</span>
              <button onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}>
                {form.isActive
                  ? <ToggleRight className="w-8 h-8 text-primary" />
                  : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm} className="rounded-xl">
              <X className="w-4 h-4 mr-1" /> Bekor
            </Button>
            <Button onClick={handleSubmit} disabled={createCode.isPending || updateCode.isPending} className="rounded-xl">
              <Check className="w-4 h-4 mr-1" /> {editId ? "Saqlash" : "Qo'shish"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* List */}
      <div className="space-y-3">
        {isLoading && <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div>}
        {!isLoading && codes.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">Promokodlar yo'q</div>
        )}
        {codes.map((c: any, i: number) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-lg text-primary">{c.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                  {c.isActive ? "Faol" : "Nofaol"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Chegirma: <span className="font-semibold text-foreground">
                  {c.discountType === "fixed" ? `${c.discountAmount.toLocaleString()} so'm` : `${c.discountAmount}%`}
                </span>
                {" • "}
                Ishlatildi: <span className="font-semibold text-foreground">{c.usedCount}</span>
                {c.maxUses != null && ` / ${c.maxUses}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(c)}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                title={c.isActive ? "O'chirish" : "Yoqish"}
              >
                {c.isActive ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button
                onClick={() => handleEdit(c)}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteId(c.id)}
                className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="font-bold text-lg mb-2">Promokodni o'chirish</h3>
            <p className="text-muted-foreground text-sm mb-5">Bu promokod butunlay o'chiriladi.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 rounded-xl">Bekor</Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                disabled={deleteCode.isPending}
                className="flex-1 rounded-xl"
              >
                O'chirish
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
