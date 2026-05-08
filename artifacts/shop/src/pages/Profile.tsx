import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Moon, Sun, HelpCircle, LogOut, ChevronRight, Edit2, Check, X, MessageCircle, Send, Globe, Bell } from "lucide-react";
import {
  useGetMe, getGetMeQueryKey, useUpdateMe, useLogoutCustomer,
  useGetSupportContact, getGetSupportContactQueryKey,
  useListNotifications, useMarkNotificationsRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getCustomerSession, clearCustomerSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useT, type Lang } from "@/lib/i18n";

export default function Profile() {
  const [, setLocation] = useLocation();
  const session = getCustomerSession();
  const queryClient = useQueryClient();
  const { t, lang, setLang } = useT();
  const [editing, setEditing] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));
  const [showSupport, setShowSupport] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: customer, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: supportContact } = useGetSupportContact({ query: { queryKey: getGetSupportContactQueryKey() } });
  const updateMe = useUpdateMe();
  const logoutCustomer = useLogoutCustomer();
  const { data: notifications = [] } = useListNotifications({ query: { queryKey: ["/api/notifications"] } });
  const markRead = useMarkNotificationsRead();

  const lastReadAt = (customer as any)?.lastNotificationReadAt;
  const unreadCount = (notifications as any[]).filter(
    (n: any) => !lastReadAt || new Date(n.createdAt) > new Date(lastReadAt)
  ).length;

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      markRead.mutate(undefined, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
      });
    }
  };

  const handleSaveName = () => {
    if (!name.trim()) { setEditing(false); return; }
    updateMe.mutate(
      { data: { name } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setEditing(false);
        },
      }
    );
  };

  const handleSavePhone = async () => {
    if (!phone.trim()) { setEditingPhone(false); return; }
    setPhoneError("");
    setSavingPhone(true);
    try {
      const res = await fetch("/api/customers/me/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-customer-id": String(session?.id) },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPhoneError(d.error || "Xatolik");
      } else {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setEditingPhone(false);
      }
    } catch {
      setPhoneError("Xatolik yuz berdi");
    }
    setSavingPhone(false);
  };

  const handleThemeToggle = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  const handleLogout = () => {
    logoutCustomer.mutate(undefined, {
      onSuccess: () => {
        clearCustomerSession();
        setLocation("/login");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex flex-col items-center gap-3 py-8">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-24 h-4" />
        </div>
      </div>
    );
  }

  const displayName = customer?.name || session?.name || "Foydalanuvchi";
  const displayPhone = customer?.phone || session?.phone || "";

  return (
    <div className="min-h-screen pb-6">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3">
        <h1 className="text-xl font-bold">{t("profile")}</h1>
      </div>

      {/* Avatar Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center pt-8 pb-6 px-4"
      >
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4 shadow-xl">
          {customer?.avatarUrl ? (
            <img src={customer.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-primary" />
          )}
        </div>

        {/* Ism tahrirlash */}
        {editing ? (
          <div className="flex items-center gap-2 mb-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl text-base w-40" autoFocus data-testid="input-name" />
            <button onClick={handleSaveName} className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white" data-testid="button-save-name">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(false)} className="w-8 h-8 bg-muted rounded-full flex items-center justify-center" data-testid="button-cancel-name">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold" data-testid="text-name">{displayName}</h2>
            <button onClick={() => { setName(displayName); setEditing(true); }} className="w-7 h-7 bg-muted rounded-full flex items-center justify-center" data-testid="button-edit-name">
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Telefon tahrirlash */}
        {editingPhone ? (
          <div className="flex flex-col items-center gap-1 mb-2">
            <div className="flex items-center gap-2">
              <Input
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                className="h-9 rounded-xl text-base w-44"
                placeholder="+998901234567"
                autoFocus
                data-testid="input-phone"
              />
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white disabled:opacity-60"
                data-testid="button-save-phone"
              >
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditingPhone(false); setPhoneError(""); }} className="w-8 h-8 bg-muted rounded-full flex items-center justify-center" data-testid="button-cancel-phone">
                <X className="w-4 h-4" />
              </button>
            </div>
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              {displayPhone}
            </p>
            <button
              onClick={() => { setPhone(displayPhone); setEditingPhone(true); }}
              className="w-7 h-7 bg-muted rounded-full flex items-center justify-center"
              data-testid="button-edit-phone"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Settings List */}
      <div className="px-4 space-y-3">
        {/* Theme Toggle */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <button onClick={handleThemeToggle} className="w-full flex items-center justify-between px-4 py-4" data-testid="button-theme-toggle">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <span className="font-medium">{darkMode ? t("darkMode") : t("lightMode")}</span>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center transition-all ${darkMode ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-all mx-0.5 ${darkMode ? "ml-6" : ""}`} />
            </div>
          </button>
        </div>

        {/* Language Toggle */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <span className="font-medium">{t("language")}</span>
            </div>
            <div className="flex gap-1">
              {(["uz", "ru"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    lang === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                  data-testid={`button-lang-${l}`}
                >
                  {l === "uz" ? "UZ" : "RU"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <button onClick={handleOpenNotifications} className="w-full flex items-center justify-between px-4 py-4" data-testid="button-notifications">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="font-medium">Bildirishnomalar</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} yangi
                </span>
              )}
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showNotifications ? "rotate-90" : ""}`} />
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border/50 overflow-hidden"
              >
                {(notifications as any[]).length === 0 ? (
                  <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                    Hozircha bildirishnoma yo'q
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {(notifications as any[]).slice(0, 10).map((n: any) => {
                      const isUnread = !lastReadAt || new Date(n.createdAt) > new Date(lastReadAt);
                      return (
                        <div key={n.id} className={`px-4 py-3 ${isUnread ? "bg-primary/5" : ""}`}>
                          <p className="text-sm whitespace-pre-wrap">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("uz-UZ")}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Support */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <button onClick={() => setShowSupport(!showSupport)} className="w-full flex items-center justify-between px-4 py-4" data-testid="button-support">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-primary" />
              <span className="font-medium">{t("support")}</span>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showSupport ? "rotate-90" : ""}`} />
          </button>

          {showSupport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="border-t border-border/50 px-4 py-4 space-y-3"
            >
              {supportContact?.phone && (
                <a href={`tel:${supportContact.phone}`} className="flex items-center gap-3 text-sm" data-testid="link-support-phone">
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-none">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("phone")}</p>
                    <p className="font-semibold">{supportContact.phone}</p>
                  </div>
                </a>
              )}
              {supportContact?.telegram && (
                <a href={`https://t.me/${supportContact.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm" data-testid="link-support-telegram">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-none">
                    <Send className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telegram</p>
                    <p className="font-semibold">{supportContact.telegram}</p>
                  </div>
                </a>
              )}
              <button
                onClick={() => setLocation("/chat")}
                className="w-full flex items-center gap-3 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-3 rounded-xl transition-all"
                data-testid="button-go-to-chat"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">Admin bilan chatda gaplashing</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Logout */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-4 text-destructive" data-testid="button-logout">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{t("logout")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
