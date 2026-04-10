import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, X, Image as ImageIcon } from "lucide-react";
import { useListBanners, getListBannersQueryKey, useCreateBanner, useDeleteBanner } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Banners() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const { data: banners } = useListBanners({ query: { queryKey: getListBannersQueryKey() } });
  const createBanner = useCreateBanner();
  const deleteBanner = useDeleteBanner();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBannersQueryKey() });

  const handleCreate = () => {
    createBanner.mutate(
      { data: { imageUrl, title: title || undefined, link: link || undefined, isActive: true, sortOrder: parseInt(sortOrder) || 0 } },
      { onSuccess: () => { invalidate(); setShowModal(false); setImageUrl(""); setTitle(""); setLink(""); setSortOrder("0"); } }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Bannerni o'chirishni tasdiqlaysizmi?")) return;
    deleteBanner.mutate({ id }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bannerlar</h1>
        <Button onClick={() => setShowModal(true)} className="rounded-xl" data-testid="button-add-banner">
          <Plus className="w-4 h-4 mr-2" /> Qo'shish
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {banners?.map((banner, i) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border/50 overflow-hidden"
            data-testid={`banner-${banner.id}`}
          >
            {banner.imageUrl ? (
              <img src={banner.imageUrl} alt={banner.title || "Banner"} className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 bg-muted flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{banner.title || "Sarlavsiz banner"}</p>
                <p className="text-xs text-muted-foreground">Tartib: {banner.sortOrder}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${banner.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                  {banner.isActive ? "Faol" : "Nofaol"}
                </span>
                <button onClick={() => handleDelete(banner.id)} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center" data-testid={`button-delete-banner-${banner.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-3xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Yangi banner</h3>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Rasm URL *</label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="rounded-xl" data-testid="input-banner-image" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Sarlavha</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" data-testid="input-banner-title" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Havola</label>
              <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className="rounded-xl" data-testid="input-banner-link" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Tartib raqami</label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="rounded-xl" data-testid="input-banner-order" />
            </div>
            {imageUrl && <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl" />}
            <Button onClick={handleCreate} disabled={!imageUrl || createBanner.isPending} className="w-full rounded-xl" data-testid="button-save-banner">
              Qo'shish
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
