import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { useListCategories, getListCategoriesQueryKey, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Categories() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { data: categories, isLoading } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });

  const openCreate = () => { setEditId(null); setName(""); setImageUrl(""); setShowModal(true); };
  const openEdit = (c: any) => { setEditId(c.id); setName(c.name); setImageUrl(c.imageUrl || ""); setShowModal(true); };

  const handleSave = () => {
    const data = { name, imageUrl: imageUrl || undefined };
    if (editId) {
      updateCategory.mutate({ id: editId, data }, { onSuccess: () => { invalidate(); setShowModal(false); } });
    } else {
      createCategory.mutate({ data }, { onSuccess: () => { invalidate(); setShowModal(false); } });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Kategoriyani o'chirishni tasdiqlaysizmi?")) return;
    deleteCategory.mutate({ id }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kategoriyalar</h1>
        <Button onClick={openCreate} className="rounded-xl" data-testid="button-add-category">
          <Plus className="w-4 h-4 mr-2" /> Qo'shish
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories?.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3"
            data-testid={`category-${cat.id}`}
          >
            {cat.imageUrl ? (
              <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 rounded-xl object-cover flex-none" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-muted flex-none" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{cat.name}</p>
              <p className="text-xs text-muted-foreground">{cat.productCount} ta mahsulot</p>
            </div>
            <div className="flex gap-2 flex-none">
              <button onClick={() => openEdit(cat)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center" data-testid={`button-edit-cat-${cat.id}`}>
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(cat.id)} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center" data-testid={`button-delete-cat-${cat.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-3xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{editId ? "Tahrirlash" : "Yangi kategoriya"}</h3>
              <button onClick={() => setShowModal(false)} data-testid="button-close-modal"><X className="w-6 h-6" /></button>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Nomi *</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl" data-testid="input-category-name" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Rasm URL</label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="rounded-xl" data-testid="input-category-image" />
            </div>
            <Button onClick={handleSave} disabled={!name || createCategory.isPending || updateCategory.isPending} className="w-full rounded-xl" data-testid="button-save-category">
              {editId ? "Saqlash" : "Qo'shish"}
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
