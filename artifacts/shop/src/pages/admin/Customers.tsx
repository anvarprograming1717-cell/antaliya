import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Phone, Trash2, AlertTriangle, Coins } from "lucide-react";
import { useListCustomers, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Customers() {
  const queryClient = useQueryClient();
  const { data: customers, isLoading } = useListCustomers({ query: { queryKey: getListCustomersQueryKey() } });
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(`/api/customers/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
    } catch {}
    setDeleting(null);
    setConfirmId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Mijozlar</h1>
        {customers && <span className="text-muted-foreground text-sm">({customers.length} ta)</span>}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="w-full h-16 rounded-xl" />)}</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ism</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefon</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Coinlar</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ro'yxat sanasi</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/20"
                  data-testid={`customer-${c.id}`}
                >
                  <td className="px-4 py-3 text-muted-foreground">{c.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-none">
                        {(c.name || "?")[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{c.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{c.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{(c as any).coins ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(c.createdAt).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-4 py-3">
                    {confirmId === c.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive font-medium">O'chirilsinmi?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2 text-xs"
                          disabled={deleting === c.id}
                          onClick={() => handleDelete(c.id)}
                          data-testid={`button-confirm-delete-${c.id}`}
                        >
                          Ha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => setConfirmId(null)}
                        >
                          Yo'q
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(c.id)}
                        className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors"
                        data-testid={`button-delete-customer-${c.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
