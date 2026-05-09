import React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Image as ImageIcon,
  Truck,
  ShoppingCart,
  Users,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Navigation2,
  Tag,
  Moon,
  Sun,
} from "lucide-react";
import { useAdminLogout } from "@workspace/api-client-react";
import { clearAdminSession } from "@/lib/auth";

const ADMIN_LANG_KEY = "admin_lang";

function useAdminLang() {
  const [lang, setLangState] = React.useState<"uz" | "ru">(() => {
    return (localStorage.getItem(ADMIN_LANG_KEY) as "uz" | "ru") || "uz";
  });
  const setLang = (l: "uz" | "ru") => {
    localStorage.setItem(ADMIN_LANG_KEY, l);
    setLangState(l);
  };
  return { lang, setLang };
}

const NAV_LABELS: Record<string, { uz: string; ru: string }> = {
  Dashboard: { uz: "Bosh sahifa", ru: "Главная" },
  Products: { uz: "Mahsulotlar", ru: "Товары" },
  Categories: { uz: "Kategoriyalar", ru: "Категории" },
  Banners: { uz: "Bannerlar", ru: "Баннеры" },
  Delivery: { uz: "Yetkazib berish", ru: "Доставка" },
  Orders: { uz: "Buyurtmalar", ru: "Заказы" },
  Customers: { uz: "Mijozlar", ru: "Клиенты" },
  Chat: { uz: "Chat", ru: "Чат" },
  Notifications: { uz: "Xabarnomalar", ru: "Уведомления" },
  Couriers: { uz: "Kuryerlar", ru: "Курьеры" },
  "Promo Codes": { uz: "Promokodlar", ru: "Промокоды" },
  Settings: { uz: "Sozlamalar", ru: "Настройки" },
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const adminLogout = useAdminLogout();
  const { lang, setLang } = useAdminLang();
  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  const handleLogout = () => {
    adminLogout.mutate(undefined, {
      onSuccess: () => {
        clearAdminSession();
        setLocation("/admin/login");
      }
    });
  };

  const t = (key: string) => {
    return NAV_LABELS[key]?.[lang] ?? key;
  };

  const navItems = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/products", icon: Package, label: "Products" },
    { href: "/admin/categories", icon: FolderTree, label: "Categories" },
    { href: "/admin/banners", icon: ImageIcon, label: "Banners" },
    { href: "/admin/delivery", icon: Truck, label: "Delivery" },
    { href: "/admin/customers", icon: Users, label: "Customers" },
    { href: "/admin/chat", icon: MessageSquare, label: "Chat" },
    { href: "/admin/notifications", icon: Bell, label: "Notifications" },
    { href: "/admin/couriers", icon: Navigation2, label: "Couriers" },
    { href: "/admin/promo-codes", icon: Tag, label: "Promo Codes" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border justify-between">
          <h1 className="text-xl font-bold text-primary">ShopUz Admin</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={isDark ? "Yorug' rejim" : "Qorong'u rejim"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Language Toggle */}
        <div className="px-3 pt-3 pb-1 flex gap-1">
          {(["uz", "ru"] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-colors ${lang === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`admin-nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <Icon className="w-5 h-5" />
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors"
            data-testid="admin-logout"
          >
            <LogOut className="w-5 h-5" />
            {lang === "uz" ? "Chiqish" : "Выйти"}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <h1 className="text-xl font-bold text-primary md:hidden">ShopUz Admin</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex gap-1">
              {(["uz", "ru"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors md:hidden ${lang === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
