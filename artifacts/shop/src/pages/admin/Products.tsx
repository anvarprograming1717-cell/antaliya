import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, X, Package, Upload, Link as LinkIcon, Star, Coins } from "lucide-react";
import { useDeleteProduct, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type UnitType = "dona" | "kg" | "pachka" | "katta" | "kichik" | "o'rta";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  oldPrice: string;
  images: string;
  categoryId: string;
  inStock: boolean;
  unit: UnitType;
  isFeatured: boolean;
  coinProduct: boolean;
  coinThreshold: string;
};

const UNITS: Array<{ value: UnitType; label: string }> = [
  { value: "dona", label: "dona" },
  { value: "kg", label: "kg" },
  { value: "pachka", label: "pachka" },
  { value: "katta", label: "katta" },
  { value: "o'rta", label: "o'rta" },
  { value: "kichik", label: "kichik" },
];

const emptyForm: ProductForm = {
  name: "", description: "", price: "", oldPrice: "", images: "",
  categoryId: "", inStock: true, unit: "dona", isFeatured: false,
  coinProduct: false, coinThreshold: "0",
};

export default function Products() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>();
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const fileRef = useRef<HTMLInputElement>(null);

  const productsQueryKey = ["/api/products", "admin", search, filterCategoryId];
  const { data: productsData, isLoading } = useQuery({
    queryKey: productsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ showAll: "true", limit: "200" });
      if (search) params.set("search", search);
      if (filterCategoryId) params.set("categoryId", String(filterCategoryId));
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Mahsulotlarni yuklashda xato");
      return res.json();
    },
  });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const deleteProduct = useDeleteProduct();
  const [saving, setSaving] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }).then(() =>
    queryClient.invalidateQueries({ queryKey: productsQueryKey })
  );

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, categoryId: filterCategoryId ? String(filterCategoryId) : "" });
    setImageMode("url");
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
      unit: (p.unit as UnitType) || "dona",
      isFeatured: p.isFeatured || false,
      coinProduct: p.coinProduct || false,
      coinThreshold: String(p.coinThreshold ?? 0),
    });
    setImageMode("url");
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      if (!r.ok) throw new Error("Upload failed");
      const { url } = await r.json();
      setForm(f => ({ ...f, images: f.images ? f.images + "\n" + url : url }));
    } catch {
      alert("Rasmni yuklashda xato bo'ldi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Mahsulot nomini kiriting!"); return; }
    const priceNum = parseFloat(form.price);
    if (!form.price || isNaN(priceNum) || priceNum <= 0) { alert("To'g'ri narx kiriting!"); return; }

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: priceNum,
      oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : undefined,
      images: form.images.split("\n").map(s => s.trim()).filter(Boolean),
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      inStock: form.inStock,
      unit: form.unit,
      isFeatured: form.isFeatured,
      coinProduct: form.coinProduct,
      coinThreshold: form.coinProduct ? (parseInt(form.coinThreshold) || 0) : 0,
    };

    setSaving(true);
    try {
      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Xato: " + (err?.error || res.statusText));
        return;
      }
      await invalidate();
      setShowModal(false);
    } catch (e: any) {
      alert("Xato: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    deleteProduct.mutate({ id }, { onSuccess: invalidate });
  };

  const products = (productsData as any)?.products ?? productsData ?? [];
  const imagesList = form.images.split("\n").map(s => s.trim()).filter(Boolean);

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
              {products.map((p: any) => (
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
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium line-clamp-1">{p.name}</p>
                          {p.isFeatured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-none" />}
                          {p.coinProduct && <span className="flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full"><Coins className="w-2.5 h-2.5" />{p.coinThreshold}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.categoryName || "Kategoriyasiz"} · {p.unit}</p>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-card rounded-t-3xl flex items-center justify-between px-6 py-4 border-b border-border z-10">
              <h3 className="font-bold text-lg">{editId ? "Tahrirlash" : "Yangi mahsulot"}</h3>
              <button onClick={() => setShowModal(false)} data-testid="button-close-modal">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Nomi *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" placeholder="Mahsulot nomi" data-testid="input-product-name" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Tavsif</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl resize-none" rows={2} data-testid="input-product-desc" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Yangi narx *</label>
                  <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="rounded-xl" placeholder="0" data-testid="input-product-price" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Eski narx</label>
                  <Input type="number" value={form.oldPrice} onChange={e => setForm(f => ({ ...f, oldPrice: e.target.value }))} className="rounded-xl" placeholder="Chegirma oldin" data-testid="input-product-oldprice" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Rasmlar</label>
                <div className="flex gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className={`flex-1 h-9 rounded-xl text-xs font-semibold border-2 flex items-center justify-center gap-1.5 transition-all ${imageMode === "url" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> URL orqali
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("upload")}
                    className={`flex-1 h-9 rounded-xl text-xs font-semibold border-2 flex items-center justify-center gap-1.5 transition-all ${imageMode === "upload" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Kompyuterdan
                  </button>
                </div>

                {imageMode === "url" ? (
                  <Textarea
                    value={form.images}
                    onChange={e => setForm(f => ({ ...f, images: e.target.value }))}
                    className="rounded-xl resize-none"
                    rows={3}
                    placeholder="https://... (har bir URL yangi qatorda)"
                    data-testid="input-product-images"
                  />
                ) : (
                  <div
                    onClick={() => !uploading && fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${uploading ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Rasmni tanlash uchun bosing</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — max 10MB</p>
                      </>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </div>
                )}

                {imagesList.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {imagesList.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, images: imagesList.filter((_, idx) => idx !== i).join("\n") }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
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
                  <select
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value as UnitType }))}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                    data-testid="select-unit"
                  >
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div
                    onClick={() => setForm(f => ({ ...f, inStock: !f.inStock }))}
                    className={`w-12 h-6 rounded-full flex items-center transition-all ${form.inStock ? "bg-primary" : "bg-muted"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow mx-0.5 transition-all ${form.inStock ? "ml-6" : ""}`} />
                  </div>
                  <span className="text-sm font-medium">Mavjud</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div
                    onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}
                    className={`w-12 h-6 rounded-full flex items-center transition-all ${form.isFeatured ? "bg-yellow-500" : "bg-muted"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow mx-0.5 transition-all ${form.isFeatured ? "ml-6" : ""}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Tavsiya</span>
                  </div>
                </label>
              </div>

              <div className="border border-amber-200 dark:border-amber-700/50 rounded-2xl p-4 space-y-3 bg-amber-50/50 dark:bg-amber-900/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setForm(f => ({ ...f, coinProduct: !f.coinProduct }))}
                    className={`w-12 h-6 rounded-full flex items-center transition-all flex-none ${form.coinProduct ? "bg-amber-500" : "bg-muted"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow mx-0.5 transition-all ${form.coinProduct ? "ml-6" : ""}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Coin mahsulot</span>
                  </div>
                </label>
                {form.coinProduct && (
                  <div>
                    <label className="text-xs text-amber-700 dark:text-amber-300 font-medium block mb-1">Minimal coin miqdori</label>
                    <Input
                      type="number"
                      value={form.coinThreshold}
                      onChange={e => setForm(f => ({ ...f, coinThreshold: e.target.value }))}
                      className="rounded-xl h-9 text-sm"
                      min="1"
                      placeholder="Masalan: 20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Foydalanuvchi shu coindan ko'p bo'lsa, bu mahsulot ko'rsatiladi</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSave}
                disabled={!form.name || !form.price || saving || uploading}
                className="w-full rounded-xl"
                data-testid="button-save-product"
              >
                {saving ? "Saqlanmoqda..." : editId ? "Saqlash" : "Qo'shish"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
