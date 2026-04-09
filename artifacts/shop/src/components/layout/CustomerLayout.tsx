import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ShoppingCart, Heart, User, Clock, ShoppingBag } from "lucide-react";
import { useGetCart, getGetCartQueryKey } from "@workspace/api-client-react";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: cartItems } = useGetCart({ query: { queryKey: getGetCartQueryKey() } });

  const cartCount = cartItems?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const navItems = [
    { href: "/", icon: Home, label: "Katalog" },
    { href: "/cart", icon: ShoppingCart, label: "Savatcha", badge: cartCount },
    { href: "/orders", icon: Clock, label: "Buyurtmalar" },
    { href: "/liked", icon: Heart, label: "Sevimlilar" },
    { href: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="w-full max-w-md mx-auto relative min-h-screen shadow-2xl bg-background overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 overflow-y-auto w-full h-full pb-24"
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 glass-panel border-t border-white/20 dark:border-white/10 pb-safe z-50">
          {/* Logo strip */}
          <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
            <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingBag className="w-3 h-3 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-extrabold tracking-tight">
              <span className="text-primary">Shop</span>
              <span className="text-foreground">Uz</span>
            </span>
          </div>

          {/* Nav Icons */}
          <div className="flex justify-between items-center pb-3 px-4">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-16 gap-1 relative ${
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
      </main>
    </div>
  );
}
