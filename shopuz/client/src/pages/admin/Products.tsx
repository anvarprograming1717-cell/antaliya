import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check, Package } from "lucide-react";
import { useListProducts, getListProductsQueryKey, useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  oldPrice: string;
  images: string;
  categoryId: string;
  inStock: boolean;
  unit: "dona" | "kg" | "pachka";
};

const emptyForm: ProductForm = { name: "", description: "", price: "", oldPrice: "", images: "", categoryId: "", inStock: true, unit: "dona" };

export default function Products() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>();

  const { data: productsData, isLoading } = useListProducts(
    { search: search || undefined, categoryId: filterCategoryId, limit: 200 },
    { query: { queryKey: getListProductsQueryKey({ search: search || undefined, categoryId: filterCategoryId, limit: 200 }) } }
  );
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/products"] });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, categoryId: filterCategoryId ? String(filterCategoryId) : "" });
    setShowModal(true);
  };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      oldPrice: p.oldPrice ? String(p.oldPrice) : "",
      images: (p.images || []).join("\n"),
      categoryId: p.categoryId ? String(p.categoryId) : "",
      inStock: p.inStock,
      unit: (p.unit as any) || "dona",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Mahsulot nomini kiriting!"); return; }
    const priceNum = parseFloat(form.price);
    if (!form.price || isNaN(priceNum) || priceNum <= 0) { alert("To'g'ri narx kiriting!"); return; }

    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: priceNum,
      oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : undefined,
      images: form.images.split("\n").map(s => s.trim()).filter(Boolean),
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      inStock: form.inStock,
      unit: form.unit,
    };

    if (editId) {
      updateProduct.mutate(
        { id: editId, data },
        {
          onSuccess: () => { invalidate(); setShowModal(false); },
          onError: (err: any) => alert("Xato: " + (err?.message || JSON.stringify(err))),
        }
      );
    } else {
      createProduct.mutate(
        { data: data as any },
        {
          onSuccess: () => { invalidate(); setShowModal(false); },
          onError: (err: any) => alert("Xato: " + (err?.message || JSON.stringify(err))),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    deleteProduct.mutate({ id }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mahsulotlar</h1>
        <Button onClick={openCreate} className="rounded-xl" data-testid="button-add-product">
          <Plus className="w-4 h-4 mr-2" /> Qo'shish
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mahsulot qidirish..."
          className="rounded-xl max-w-xs"
          data-testid="input-search"
        />
        <select
          value={filterCategoryId ?? ""}
          onChange={e => setFilterCategoryId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm min-w-[160px]"
          data-testid="select-filter-category"
        >
          <option value="">Barcha kategoriyalar</option>
          {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="w-full h-16 rounded-xl" />)}</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mahsulot</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Narx</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Holat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {productsData?.products.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20" data-testid={`product-row-${p.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-none" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-none">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.categoryName || "Kategoriyasiz"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{(p.price as number).toLocaleString()} so'm</p>
                    {p.oldPrice && <p className="text-xs text-muted-foreground line-through">{(p.oldPrice as number).toLocaleString()}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {p.inStock ? "Mavjud" : "Tugagan"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center" data-testid={`button-edit-${p.id}`}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center" data-testid={`button-delete-${p.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-card rounded-t-3xl flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">{editId ? "Tahrirlash" : "Yangi mahsulot"}</h3>
              <button onClick={() => setShowModal(false)} data-testid="button-close-modal">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Nomi *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" data-testid="input-product-name" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Tavsif</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl resize-none" rows={3} data-testid="input-product-desc" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Narx *</label>
                  <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="rounded-xl" data-testid="input-product-price" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Eski narx</label>
                  <Input type="number" value={form.oldPrice} onChange={e => setForm(f => ({ ...f, oldPrice: e.target.value }))} className="rounded-xl" data-testid="input-product-oldprice" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Rasm URL-lari (har biri yangi qatorda)</label>
                <Textarea value={form.images} onChange={e => setForm(f => ({ ...f, images: e.target.value }))} className="rounded-xl resize-none" rows={3} placeholder="https://..." data-testid="input-product-images" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Kategoriya</label>
                  <select
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                    data-testid="select-category"
                  >
                    <option value="">Kategoriyasiz</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">O'lchov birligi</label>
                  <div className="flex gap-1.5">
                    {(["dona", "kg", "pachka"] as const).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, unit: u }))}
                        className={`flex-1 h-10 rounded-xl text-xs font-semibold border-2 transition-all ${form.unit === u ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                        data-testid={`button-unit-${u}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, inStock: !f.inStock }))}
                  className={`w-12 h-6 rounded-full flex items-center transition-all ${form.inStock ? "bg-primary" : "bg-muted"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow mx-0.5 transition-all ${form.inStock ? "ml-6" : ""}`} />
                </div>
                <span className="text-sm font-medium">Mavjud</span>
              </label>

              <Button
                onClick={handleSave}
                disabled={!form.name || !form.price || createProduct.isPending || updateProduct.isPending}
                className="w-full rounded-xl"
                data-testid="button-save-product"
              >
                {editId ? "Saqlash" : "Qo'shish"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
