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
                      <div className="relative w-8 h-8 flex-none">
                        {(c as any).telegramPhoto ? (
                          <img
                            src={(c as any).telegramPhoto}
                            alt="avatar"
                            className="w-8 h-8 rounded-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                            {(c.name || "?")[0].toUpperCase()}
                          </div>
                        )}
                        {(c as any).telegramId && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#2AABEE] rounded-full border border-background flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{c.name || "—"}</span>
                        {(c as any).telegramUsername && (
                          <p className="text-xs text-[#2AABEE]">@{(c as any).telegramUsername}</p>
                        )}
                      </div>
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
