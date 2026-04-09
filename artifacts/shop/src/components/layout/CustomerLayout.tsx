import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Home, ShoppingCart, Heart, User, Clock } from "lucide-react";
import { useGetCart, getGetCartQueryKey, useGetSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: cartItems } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });
  const { data: siteSettings } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });

  const cartCount = cartItems?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const navItems = [
    { href: "/", icon: Home, label: "Katalog" },
    { href: "/cart", icon: ShoppingCart, label: "Savat", badge: cartCount },
    { href: "/orders", icon: Clock, label: "Buyurtma" },
    { href: "/liked", icon: Heart, label: "Sevimli" },
    { href: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="flex justify-center bg-background min-h-dvh">
      <div
        className="w-full max-w-md relative flex flex-col shadow-2xl bg-background overflow-hidden"
        style={{ height: "100dvh" }}
      >
        {/* Scrollable content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 overflow-y-auto"
            style={{ paddingBottom: "90px" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {/* iOS 26-style Floating Pill Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4">
          <LayoutGroup>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center gap-1 px-2 py-2 rounded-[28px] border border-white/30 dark:border-white/15"
              style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              {/* dark mode overlay */}
              <div
                className="absolute inset-0 rounded-[28px] dark:bg-black/40 pointer-events-none"
                style={{ backdropFilter: "blur(0px)" }}
              />

              {navItems.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className="relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-[20px] px-3 py-2 min-w-[56px] transition-colors"
                  >
                    {/* Active background bubble */}
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 rounded-[20px]"
                        style={{
                          background: "rgba(79, 70, 229, 0.12)",
                          border: "1px solid rgba(79, 70, 229, 0.2)",
                        }}
                        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
                      />
                    )}

                    {/* Icon */}
                    <motion.div
                      className="relative"
                      animate={isActive ? { scale: 1.08 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Icon
                        className={`w-[22px] h-[22px] transition-colors duration-200 ${
                          isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"
                        }`}
                        strokeWidth={isActive ? 2.3 : 1.9}
                      />
                      {/* Cart badge */}
                      {item.badge ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none"
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </motion.span>
                      ) : null}
                    </motion.div>

                    {/* Label */}
                    <motion.span
                      animate={isActive ? { opacity: 1 } : { opacity: 0.55 }}
                      transition={{ duration: 0.2 }}
                      className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
                        isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {item.label}
                    </motion.span>
                  </Link>
                );
              })}
            </motion.div>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}
