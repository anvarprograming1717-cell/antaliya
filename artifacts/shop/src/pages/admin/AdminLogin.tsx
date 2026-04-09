import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAdminSession } from "@/lib/auth";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const adminLogin = useAdminLogin();

  const handleLogin = () => {
    setError("");
    adminLogin.mutate(
      { data: { password } },
      {
        onSuccess: () => {
          setAdminSession();
          setLocation("/admin/dashboard");
        },
        onError: () => {
          setError("Noto'g'ri parol");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">ShopUz boshqaruv paneli</p>
        </div>

        <div className="bg-card rounded-3xl p-6 shadow-xl border border-border/50 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Parol</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                placeholder="Parolni kiriting"
                className="pl-10 h-12 rounded-xl"
                data-testid="input-password"
              />
            </div>
            {error && <p className="text-destructive text-sm mt-1" data-testid="text-error">{error}</p>}
          </div>

          <Button
            onClick={handleLogin}
            disabled={!password || adminLogin.isPending}
            className="w-full h-12 rounded-xl"
            data-testid="button-login"
          >
            {adminLogin.isPending ? "Kirilmoqda..." : "Kirish"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
