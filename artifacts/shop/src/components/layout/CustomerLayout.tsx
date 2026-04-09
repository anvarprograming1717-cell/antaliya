import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ShoppingCart, Heart, User, Clock, ShoppingBag } from "lucide-react";
import { useGetCart, getGetCartQueryKey, useGetSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: cartItems } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const { data: siteSettings } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });

  const cartCount = cartItems?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const siteName = siteSettings?.siteName || "ShopUz";
  const logoUrl = siteSettings?.logoUrl || null;

  const navItems = [
    { href: "/", icon: Home, label: "Katalog" },
    { href: "/cart", icon: ShoppingCart, label: "Savatcha", badge: cartCount },
    { href: "/orders", icon: Clock, label: "Buyurtmalar" },
    { href: "/liked", icon: Heart, label: "Sevimlilar" },
    { href: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="flex justify-center bg-background min-h-dvh">
      <div
        className="w-full max-w-md relative flex flex-col shadow-2xl bg-background overflow-hidden"
        style={{ height: "100dvh" }}
      >
        {/* Scrollable content area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 overflow-y-auto"
            style={{ paddingBottom: "88px" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Tab Bar — always fixed at bottom of container */}
        <div className="absolute bottom-0 left-0 right-0 glass-panel border-t border-white/20 dark:border-white/10 z-50">
          {/* Logo strip */}
          <div className="flex items-center justify-center gap-1.5 pt-2 pb-0.5">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-5 w-auto max-w-[100px] object-contain" />
            ) : (
              <>
                <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center">
                  <ShoppingBag className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-extrabold tracking-tight">
                  <span className="text-primary">{siteName.slice(0, Math.ceil(siteName.length / 2))}</span>
                  <span className="text-foreground">{siteName.slice(Math.ceil(siteName.length / 2))}</span>
                </span>
              </>
            )}
          </div>

          {/* Nav Icons */}
          <div className="flex justify-between items-center pb-3 px-4 pt-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-16 gap-0.5 relative ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <div className="relative">
                    <Icon className={`w-6 h-6 ${isActive ? "fill-primary/20" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                    {item.badge ? (
                      <span className="absolute -top-1 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
