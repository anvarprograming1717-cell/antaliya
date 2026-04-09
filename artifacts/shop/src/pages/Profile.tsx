import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { User, Phone, Globe, Moon, Sun, HelpCircle, LogOut, ChevronRight, Edit2, Check, X } from "lucide-react";
import { useGetMe, getGetMeQueryKey, useUpdateMe, useLogoutCustomer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getCustomerSession, clearCustomerSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function Profile() {
  const [, setLocation] = useLocation();
  const session = getCustomerSession();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));

  const { data: customer, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateMe = useUpdateMe();
  const logoutCustomer = useLogoutCustomer();

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

  return (
    <div className="min-h-screen pb-6">
      <div className="sticky top-0 z-40 glass-panel border-b border-white/20 px-4 py-3">
        <h1 className="text-xl font-bold">Profil</h1>
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

        {editing ? (
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 rounded-xl text-base w-40"
              autoFocus
              data-testid="input-name"
            />
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
            <button
              onClick={() => { setName(displayName); setEditing(true); }}
              className="w-7 h-7 bg-muted rounded-full flex items-center justify-center"
              data-testid="button-edit-name"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        <p className="text-muted-foreground flex items-center gap-1.5">
          <Phone className="w-4 h-4" />
          {customer?.phone || session?.phone}
        </p>
      </motion.div>

      {/* Settings List */}
      <div className="px-4 space-y-3">
        {/* Theme Toggle */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <button
            onClick={handleThemeToggle}
            className="w-full flex items-center justify-between px-4 py-4"
            data-testid="button-theme-toggle"
          >
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <span className="font-medium">{darkMode ? "Qorong'u rejim" : "Yorug' rejim"}</span>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center transition-all ${darkMode ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-all mx-0.5 ${darkMode ? "ml-6" : ""}`} />
            </div>
          </button>
        </div>

        {/* Support */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <button
            onClick={() => setLocation("/chat")}
            className="w-full flex items-center justify-between px-4 py-4"
            data-testid="button-support"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-primary" />
              <span className="font-medium">Texnik yordam</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Logout */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-4 text-destructive"
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Chiqish</span>
          </button>
        </div>
      </div>
    </div>
  );
}
