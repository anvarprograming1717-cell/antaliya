import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, MessageSquare, Lock, Check, Globe, ImageIcon, Send, Plus, Trash2, Calendar, ChefHat } from "lucide-react";
import {
  useGetSupportContact, getGetSupportContactQueryKey, useUpdateSupportContact,
  useUpdateAdminPassword, useGetSiteSettings, getGetSiteSettingsQueryKey, useUpdateSiteSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: contact } = useGetSupportContact({ query: { queryKey: getGetSupportContactQueryKey() } });
  const { data: siteSettings } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });
  const updateContact = useUpdateSupportContact();
  const updatePassword = useUpdateAdminPassword();
  const updateSite = useUpdateSiteSettings();

  const [contactForm, setContactForm] = useState({ phone: "", telegram: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [siteForm, setSiteForm] = useState({ siteName: "", logoUrl: "" });
  const [contactSaved, setContactSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [siteSaved, setSiteSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [tgAdminIds, setTgAdminIds] = useState<number[]>([]);
  const [newTgId, setNewTgId] = useState("");
  const [tgSaved, setTgSaved] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [workDaysSaved, setWorkDaysSaved] = useState(false);
  const [workDaysLoading, setWorkDaysLoading] = useState(false);

  // Chef password
  const [chefPassword, setChefPassword] = useState("");
  const [chefConfirm, setChefConfirm] = useState("");
  const [chefSaved, setChefSaved] = useState(false);
  const [chefSaving, setChefSaving] = useState(false);
  const [chefError, setChefError] = useState("");

  useEffect(() => {
    fetch("/api/admin/telegram-admins").then(r => r.json()).then(d => setTgAdminIds(d.adminIds || [])).catch(() => {});
    fetch("/api/admin/work-schedule").then(r => r.json()).then(d => setWorkDays(d.workDays || [1, 2, 3, 4, 5, 6])).catch(() => {});
  }, []);

  useEffect(() => {
    if (contact) {
      setContactForm({ phone: contact.phone, telegram: contact.telegram || "" });
    }
  }, [contact]);

  useEffect(() => {
    if (siteSettings) {
      setSiteForm({ siteName: siteSettings.siteName || "", logoUrl: siteSettings.logoUrl || "" });
    }
  }, [siteSettings]);

  const handleSaveContact = () => {
    updateContact.mutate(
      { data: { phone: contactForm.phone, telegram: contactForm.telegram || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSupportContactQueryKey() });
          setContactSaved(true);
          setTimeout(() => setContactSaved(false), 2000);
        },
      }
    );
  };

  const handleSaveSite = () => {
    updateSite.mutate(
      { data: { siteName: siteForm.siteName || null, logoUrl: siteForm.logoUrl || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
          setSiteSaved(true);
          setTimeout(() => setSiteSaved(false), 2000);
        },
      }
    );
  };

  const handleSavePassword = () => {
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Yangi parollar mos kelmadi");
      return;
    }
    if (passwordForm.newPassword.length < 4) {
      setPasswordError("Parol kamida 4 ta belgidan iborat bo'lishi kerak");
      return;
    }
    updatePassword.mutate(
      { data: { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword } },
      {
        onSuccess: () => {
          setPasswordSaved(true);
          setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
          setTimeout(() => setPasswordSaved(false), 2000);
        },
        onError: () => {
          setPasswordError("Joriy parol noto'g'ri");
        },
      }
    );
  };

  const handleAddTgAdmin = () => {
    const id = parseInt(newTgId.trim());
    if (isNaN(id) || id <= 0) return;
    if (tgAdminIds.includes(id)) { setNewTgId(""); return; }
    setTgAdminIds(prev => [...prev, id]);
    setNewTgId("");
  };

  const handleRemoveTgAdmin = (id: number) => setTgAdminIds(prev => prev.filter(a => a !== id));

  const handleSaveWorkDays = async () => {
    setWorkDaysLoading(true);
    try {
      await fetch("/api/admin/work-schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workDays }),
      });
      setWorkDaysSaved(true);
      setTimeout(() => setWorkDaysSaved(false), 2000);
    } catch {}
    setWorkDaysLoading(false);
  };

  const handleSaveTgAdmins = async () => {
    setTgLoading(true);
    try {
      await fetch("/api/admin/telegram-admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminIds: tgAdminIds }),
      });
      setTgSaved(true);
      setTimeout(() => setTgSaved(false), 2000);
    } catch {}
    setTgLoading(false);
  };

  const handleSaveChefPassword = async () => {
    setChefError("");
    if (!chefPassword) { setChefError("Parol kiriting"); return; }
    if (chefPassword.length < 4) { setChefError("Parol kamida 4 ta belgi bo'lishi kerak"); return; }
    if (chefPassword !== chefConfirm) { setChefError("Parollar mos kelmadi"); return; }
    setChefSaving(true);
    try {
      const r = await fetch("/api/admin/chef-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: chefPassword }),
      });
      if (r.ok) {
        setChefSaved(true);
        setChefPassword("");
        setChefConfirm("");
        setTimeout(() => setChefSaved(false), 2000);
      } else {
        setChefError("Xato yuz berdi");
      }
    } catch {
      setChefError("Server bilan aloqa yo'q");
    }
    setChefSaving(false);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-2xl font-bold">Sozlamalar</h1>

      {/* Site Branding */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <h3 className="font-bold">Sayt brendingi</h3>
        <div>
          <label className="text-sm font-medium block mb-1">Sayt nomi</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={siteForm.siteName} onChange={e => setSiteForm(f => ({ ...f, siteName: e.target.value }))} placeholder="ShopUz" className="pl-9 rounded-xl" data-testid="input-site-name" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Logotip URL</label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={siteForm.logoUrl} onChange={e => setSiteForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://example.com/logo.png" className="pl-9 rounded-xl" data-testid="input-logo-url" />
          </div>
          {siteForm.logoUrl && (
            <div className="mt-3 flex items-center gap-3">
              <img src={siteForm.logoUrl} alt="Logo preview" className="w-12 h-12 rounded-xl object-contain border border-border bg-muted/30" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <p className="text-xs text-muted-foreground">Logo ko'rinishi</p>
            </div>
          )}
        </div>
        <Button onClick={handleSaveSite} disabled={updateSite.isPending} className={`w-full rounded-xl ${siteSaved ? "bg-green-600 hover:bg-green-600" : ""}`} data-testid="button-save-site">
          {siteSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>

      {/* Support Contact */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <h3 className="font-bold">Texnik yordam kontakti</h3>
        <div>
          <label className="text-sm font-medium block mb-1">Telefon raqam</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} className="pl-9 rounded-xl" data-testid="input-support-phone" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Telegram username</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={contactForm.telegram} onChange={e => setContactForm(f => ({ ...f, telegram: e.target.value }))} placeholder="@username" className="pl-9 rounded-xl" data-testid="input-support-telegram" />
          </div>
        </div>
        <Button onClick={handleSaveContact} disabled={updateContact.isPending} className={`w-full rounded-xl ${contactSaved ? "bg-green-600 hover:bg-green-600" : ""}`} data-testid="button-save-contact">
          {contactSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>

      {/* Chef Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold">Chef panel paroli</h3>
        </div>
        <p className="text-xs text-muted-foreground">Oshpaz /chef sahifasiga kirishi uchun parol. Standart parol: chef123</p>
        <div>
          <label className="text-sm font-medium block mb-1">Yangi parol</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={chefPassword} onChange={e => setChefPassword(e.target.value)} className="pl-9 rounded-xl" placeholder="Kamida 4 ta belgi" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Parolni tasdiqlash</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={chefConfirm} onChange={e => setChefConfirm(e.target.value)} className="pl-9 rounded-xl" />
          </div>
        </div>
        {chefError && <p className="text-destructive text-sm">{chefError}</p>}
        <Button onClick={handleSaveChefPassword} disabled={chefSaving || !chefPassword} className={`w-full rounded-xl ${chefSaved ? "bg-green-600 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
          {chefSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Chef parolini o'zgartirish"}
        </Button>
      </motion.div>

      {/* Change Admin Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <h3 className="font-bold">Admin parolini o'zgartirish</h3>
        <div>
          <label className="text-sm font-medium block mb-1">Joriy parol</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} className="pl-9 rounded-xl" data-testid="input-current-password" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Yangi parol</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} className="pl-9 rounded-xl" data-testid="input-new-password" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Yangi parolni tasdiqlash</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} className="pl-9 rounded-xl" data-testid="input-confirm-password" />
          </div>
        </div>
        {passwordError && <p className="text-destructive text-sm" data-testid="text-password-error">{passwordError}</p>}
        <Button onClick={handleSavePassword} disabled={!passwordForm.currentPassword || !passwordForm.newPassword || updatePassword.isPending} className={`w-full rounded-xl ${passwordSaved ? "bg-green-600 hover:bg-green-600" : ""}`} data-testid="button-save-password">
          {passwordSaved ? <><Check className="w-4 h-4 mr-2" /> O'zgartirildi!</> : "O'zgartirish"}
        </Button>
      </motion.div>

      {/* Telegram Admin IDs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Telegram adminlar</h3>
        </div>
        <p className="text-xs text-muted-foreground">Yangi buyurtmalar haqida xabar oladigan Telegram ID lar.</p>
        <div className="space-y-2">
          {tgAdminIds.map(id => (
            <div key={id} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
              <span className="font-mono text-sm">{id}</span>
              <button onClick={() => handleRemoveTgAdmin(id)} className="text-destructive hover:text-destructive/80 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {tgAdminIds.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Admin qo'shilmagan</p>}
        </div>
        <div className="flex gap-2">
          <Input value={newTgId} onChange={e => setNewTgId(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTgAdmin()} placeholder="Telegram ID (214840221)" className="rounded-xl font-mono" type="number" />
          <Button onClick={handleAddTgAdmin} variant="outline" className="rounded-xl shrink-0"><Plus className="w-4 h-4" /></Button>
        </div>
        <Button onClick={handleSaveTgAdmins} disabled={tgLoading} className={`w-full rounded-xl ${tgSaved ? "bg-green-600 hover:bg-green-600" : ""}`}>
          {tgSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>

      {/* Ish kunlari */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Ish kunlari</h3>
        </div>
        <p className="text-xs text-muted-foreground">Ish kunlarini belgilang. Dam olish kunlarida foydalanuvchilar keyingi ish kuni haqida xabar ko'radi.</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { day: 1, label: "Dushanba" }, { day: 2, label: "Seshanba" }, { day: 3, label: "Chorshanba" },
            { day: 4, label: "Payshanba" }, { day: 5, label: "Juma" }, { day: 6, label: "Shanba" }, { day: 0, label: "Yakshanba" },
          ].map(({ day, label }) => {
            const active = workDays.includes(day);
            return (
              <button key={day} onClick={() => setWorkDays(prev => active ? prev.filter(d => d !== day) : [...prev, day])}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border/50"}`}
                data-testid={`button-workday-${day}`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-none ${active ? "bg-white border-white" : "border-muted-foreground"}`}>
                  {active && <Check className="w-2.5 h-2.5 text-primary" />}
                </div>
                {label}
              </button>
            );
          })}
        </div>
        <Button onClick={handleSaveWorkDays} disabled={workDaysLoading} className={`w-full rounded-xl ${workDaysSaved ? "bg-green-600 hover:bg-green-600" : ""}`} data-testid="button-save-work-days">
          {workDaysSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>
    </div>
  );
}
