import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, MessageSquare, Lock, Check, Globe, ImageIcon, Send, Plus, Trash2, Calendar, ChefHat, Bot, Link, UserCog, Truck, Webhook } from "lucide-react";
import {
  useGetSupportContact, getGetSupportContactQueryKey, useUpdateSupportContact,
  useUpdateAdminPassword, useGetSiteSettings, getGetSiteSettingsQueryKey, useUpdateSiteSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function TgRoleSection({
  title, description, icon: Icon, iconColor, endpoint, idKey,
}: {
  title: string; description: string; icon: any; iconColor: string; endpoint: string; idKey: string;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [newId, setNewId] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/${endpoint}`).then(r => r.json()).then(d => setIds(d[idKey] || [])).catch(() => {});
  }, [endpoint, idKey]);

  const handleAdd = () => {
    const id = newId.trim();
    if (!id) return;
    if (ids.includes(id)) { setNewId(""); return; }
    setIds(prev => [...prev, id]);
    setNewId("");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch(`/api/admin/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [idKey]: ids }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="space-y-2">
        {ids.map(id => (
          <div key={id} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
            <span className="font-mono text-sm">{id}</span>
            <button onClick={() => setIds(prev => prev.filter(a => a !== id))} className="text-destructive hover:text-destructive/80 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {ids.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Hech kim qo'shilmagan</p>}
      </div>
      <div className="flex gap-2">
        <Input value={newId} onChange={e => setNewId(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="Telegram ID (214840221)" className="rounded-xl font-mono" type="number" />
        <Button onClick={handleAdd} variant="outline" className="rounded-xl shrink-0"><Plus className="w-4 h-4" /></Button>
      </div>
      <Button onClick={handleSave} disabled={loading} className={`w-full rounded-xl ${saved ? "bg-green-600 hover:bg-green-600" : ""}`}>
        {saved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Saqlash"}
      </Button>
    </motion.div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: contact } = useGetSupportContact({ query: { queryKey: getGetSupportContactQueryKey() } });
  const { data: siteSettings } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });
  const updateContact = useUpdateSupportContact();
  const updatePassword = useUpdateAdminPassword();
  const updateSite = useUpdateSiteSettings();

  const [contactForm, setContactForm] = useState({ phone: "", telegram: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [siteForm, setSiteForm] = useState({ siteName: "", logoUrl: "", loginTitle: "", loginSubtitle: "" });
  const [contactSaved, setContactSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [siteSaved, setSiteSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("22:00");
  const [workDaysSaved, setWorkDaysSaved] = useState(false);
  const [workDaysLoading, setWorkDaysLoading] = useState(false);
  const [chefPassword, setChefPassword] = useState("");
  const [chefConfirm, setChefConfirm] = useState("");
  const [chefSaved, setChefSaved] = useState(false);
  const [chefSaving, setChefSaving] = useState(false);
  const [chefError, setChefError] = useState("");

  const [botToken, setBotToken] = useState("");
  const [botSiteUrl, setBotSiteUrl] = useState("");
  const [botDeliveryUrl, setBotDeliveryUrl] = useState("");
  const [botSaved, setBotSaved] = useState(false);
  const [botSaving, setBotSaving] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookResult, setWebhookResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/work-schedule").then(r => r.json()).then(d => {
      setWorkDays(d.workDays || [1, 2, 3, 4, 5, 6]);
      setWorkStart(d.workStart || "09:00");
      setWorkEnd(d.workEnd || "22:00");
    }).catch(() => {});
    fetch("/api/admin/bot-settings").then(r => r.json()).then(d => {
      setBotToken(d.botToken || "");
      // Auto-fill with current origin (without port) if empty
      const cleanOrigin = `${window.location.protocol}//${window.location.hostname}`;
      setBotSiteUrl(d.siteUrl || cleanOrigin);
      setBotDeliveryUrl(d.deliveryUrl || "");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (contact) setContactForm({ phone: contact.phone, telegram: contact.telegram || "" });
  }, [contact]);

  useEffect(() => {
    if (siteSettings) setSiteForm({ siteName: siteSettings.siteName || "", logoUrl: siteSettings.logoUrl || "", loginTitle: (siteSettings as any).loginTitle || "", loginSubtitle: (siteSettings as any).loginSubtitle || "" });
  }, [siteSettings]);

  const handleSaveContact = () => {
    updateContact.mutate(
      { data: { phone: contactForm.phone, telegram: contactForm.telegram || undefined } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetSupportContactQueryKey() }); setContactSaved(true); setTimeout(() => setContactSaved(false), 2000); } }
    );
  };

  const handleSaveSite = () => {
    updateSite.mutate(
      { data: { siteName: siteForm.siteName || null, logoUrl: siteForm.logoUrl || null, loginTitle: (siteForm as any).loginTitle || null, loginSubtitle: (siteForm as any).loginSubtitle || null } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() }); setSiteSaved(true); setTimeout(() => setSiteSaved(false), 2000); } }
    );
  };

  const handleSavePassword = () => {
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError("Yangi parollar mos kelmadi"); return; }
    if (passwordForm.newPassword.length < 4) { setPasswordError("Parol kamida 4 ta belgidan iborat bo'lishi kerak"); return; }
    updatePassword.mutate(
      { data: { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword } },
      {
        onSuccess: () => { setPasswordSaved(true); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setTimeout(() => setPasswordSaved(false), 2000); },
        onError: () => setPasswordError("Joriy parol noto'g'ri"),
      }
    );
  };

  const handleSaveWorkDays = async () => {
    setWorkDaysLoading(true);
    try {
      await fetch("/api/admin/work-schedule", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workDays, workStart, workEnd }) });
      setWorkDaysSaved(true); setTimeout(() => setWorkDaysSaved(false), 2000);
    } catch {}
    setWorkDaysLoading(false);
  };

  const handleSaveChefPassword = async () => {
    setChefError("");
    if (!chefPassword) { setChefError("Parol kiriting"); return; }
    if (chefPassword.length < 4) { setChefError("Parol kamida 4 ta belgi bo'lishi kerak"); return; }
    if (chefPassword !== chefConfirm) { setChefError("Parollar mos kelmadi"); return; }
    setChefSaving(true);
    try {
      const r = await fetch("/api/admin/chef-password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: chefPassword }) });
      if (r.ok) { setChefSaved(true); setChefPassword(""); setChefConfirm(""); setTimeout(() => setChefSaved(false), 2000); }
      else setChefError("Xato yuz berdi");
    } catch { setChefError("Server bilan aloqa yo'q"); }
    setChefSaving(false);
  };

  const handleSaveBotSettings = async () => {
    if (!botToken.trim()) return;
    setBotSaving(true);
    setBotSaved(false);
    setWebhookResult(null);
    try {
      // 1. Save token + URLs
      await fetch("/api/admin/bot-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken, siteUrl: botSiteUrl, deliveryUrl: botDeliveryUrl }),
      });

      // 2. Auto-register webhook using current domain (strip port — Telegram only allows 80/88/443/8443)
      const { protocol, hostname } = window.location;
      const cleanOrigin = `${protocol}//${hostname}`;
      const autoWebhookUrl = `${cleanOrigin}/api/telegram-webhook`;
      const whr = await fetch("/api/admin/setup-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: autoWebhookUrl }),
      });
      const whd = await whr.json();
      setWebhookResult({
        success: whd.success,
        msg: whd.success
          ? `✅ Bot ulandi! Webhook: ${autoWebhookUrl}`
          : `❌ Webhook xato: ${whd.description || whd.error}`,
      });

      setBotSaved(true);
      setTimeout(() => setBotSaved(false), 3000);
    } catch (e: any) {
      setWebhookResult({ success: false, msg: `❌ Xato: ${e.message}` });
    }
    setBotSaving(false);
  };

  const handleSetupWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setWebhookLoading(true);
    setWebhookResult(null);
    try {
      const r = await fetch("/api/admin/setup-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });
      const d = await r.json();
      setWebhookResult({ success: d.success, msg: d.description || (d.success ? "✅ Webhook o'rnatildi!" : "❌ Xato") });
    } catch { setWebhookResult({ success: false, msg: "❌ Server bilan aloqa yo'q" }); }
    setWebhookLoading(false);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-2xl font-bold">Sozlamalar</h1>

      {/* Site Branding */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <h3 className="font-bold">Sayt brendingi</h3>
        <div>
          <label className="text-sm font-medium block mb-1">Sayt nomi</label>
          <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={siteForm.siteName} onChange={e => setSiteForm(f => ({ ...f, siteName: e.target.value }))} placeholder="ShopUz" className="pl-9 rounded-xl" data-testid="input-site-name" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Logotip URL</label>
          <div className="relative"><ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={siteForm.logoUrl} onChange={e => setSiteForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://example.com/logo.png" className="pl-9 rounded-xl" data-testid="input-logo-url" />
          </div>
          {siteForm.logoUrl && (
            <div className="mt-3 flex items-center gap-3">
              <img src={siteForm.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain border border-border bg-muted/30" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <p className="text-xs text-muted-foreground">Logo ko'rinishi</p>
            </div>
          )}
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Login sahifasi sarlavhasi</label>
          <Input value={(siteForm as any).loginTitle} onChange={e => setSiteForm(f => ({ ...f, loginTitle: e.target.value }))} placeholder="Xush kelibsiz" className="rounded-xl" />
          <p className="text-xs text-muted-foreground mt-1">Kirish sahifasidagi katta matn (bo'sh qolsa "Xush kelibsiz" ko'rinadi)</p>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Login sahifasi tavsifi</label>
          <Input value={(siteForm as any).loginSubtitle} onChange={e => setSiteForm(f => ({ ...f, loginSubtitle: e.target.value }))} placeholder="ShopUz tizimiga kirish" className="rounded-xl" />
          <p className="text-xs text-muted-foreground mt-1">Sarlavha ostidagi kichik matn</p>
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
          <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} className="pl-9 rounded-xl" data-testid="input-support-phone" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Telegram username</label>
          <div className="relative"><MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={contactForm.telegram} onChange={e => setContactForm(f => ({ ...f, telegram: e.target.value }))} placeholder="@username" className="pl-9 rounded-xl" data-testid="input-support-telegram" />
          </div>
        </div>
        <Button onClick={handleSaveContact} disabled={updateContact.isPending} className={`w-full rounded-xl ${contactSaved ? "bg-green-600 hover:bg-green-600" : ""}`} data-testid="button-save-contact">
          {contactSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>

      {/* Telegram Bot Settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold">Telegram bot sozlamalari</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Bot tokenini kiriting va saqlang — webhook <b>avtomatik</b> ulanadi. Foydalanuvchi /start yuborganda saytga o'tish tugmalari chiqadi.
        </p>
        <div>
          <label className="text-sm font-medium block mb-1">Bot token</label>
          <div className="relative"><Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="123456789:AAFxxxxxxx" className="pl-9 rounded-xl font-mono text-xs" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">@BotFather dan olingan token</p>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">🛍 "Buyurtma berish" tugmasi URL</label>
          <div className="relative"><Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={botSiteUrl} onChange={e => setBotSiteUrl(e.target.value)} placeholder="https://sizning-sayt.replit.app" className="pl-9 rounded-xl" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Bo'sh qoldirsangiz sayt domeni avtomatik ishlatiladi</p>
        </div>
        {webhookResult && (
          <div className={`p-3 rounded-xl text-sm break-all ${webhookResult.success ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
            {webhookResult.msg}
          </div>
        )}
        <Button onClick={handleSaveBotSettings} disabled={botSaving || !botToken.trim()} className={`w-full rounded-xl ${botSaved ? "bg-green-600 hover:bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
          {botSaving ? "Ulanmoqda..." : botSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi va ulandi!</> : "Saqlash va webhookni ulash"}
        </Button>
      </motion.div>

      {/* Telegram Roles */}
      <TgRoleSection title="Telegram adminlar" description="Yangi buyurtmalar va xabarlar haqida bildirishnoma oladigan adminlar." icon={UserCog} iconColor="text-primary" endpoint="telegram-admins" idKey="adminIds" />
      <TgRoleSection title="Telegram oshpazlar (chef)" description="Yangi buyurtmalar oshpazlarga Telegram botda keladi. Chef buyurtmani tayyorlashni boshlaydi." icon={ChefHat} iconColor="text-orange-500" endpoint="telegram-chefs" idKey="chefIds" />
      <TgRoleSection title="Telegram kuryerlar" description="Buyurtma tayyor bo'lganda kuryerga Telegram botda xabar keladi." icon={Truck} iconColor="text-green-500" endpoint="telegram-couriers" idKey="courierIds" />

      {/* Chef Panel Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold">Chef panel paroli</h3>
        </div>
        <p className="text-xs text-muted-foreground">Oshpaz /chef sahifasiga kirishi uchun parol.</p>
        <div>
          <label className="text-sm font-medium block mb-1">Yangi parol</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={chefPassword} onChange={e => setChefPassword(e.target.value)} className="pl-9 rounded-xl" placeholder="Kamida 4 ta belgi" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Parolni tasdiqlash</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={chefConfirm} onChange={e => setChefConfirm(e.target.value)} className="pl-9 rounded-xl" />
          </div>
        </div>
        {chefError && <p className="text-destructive text-sm">{chefError}</p>}
        <Button onClick={handleSaveChefPassword} disabled={chefSaving || !chefPassword} className={`w-full rounded-xl ${chefSaved ? "bg-green-600 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
          {chefSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Chef parolini o'zgartirish"}
        </Button>
      </motion.div>

      {/* Admin Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <h3 className="font-bold">Admin parolini o'zgartirish</h3>
        <div>
          <label className="text-sm font-medium block mb-1">Joriy parol</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} className="pl-9 rounded-xl" data-testid="input-current-password" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Yangi parol</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} className="pl-9 rounded-xl" data-testid="input-new-password" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Yangi parolni tasdiqlash</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} className="pl-9 rounded-xl" data-testid="input-confirm-password" />
          </div>
        </div>
        {passwordError && <p className="text-destructive text-sm" data-testid="text-password-error">{passwordError}</p>}
        <Button onClick={handleSavePassword} disabled={!passwordForm.currentPassword || !passwordForm.newPassword || updatePassword.isPending} className={`w-full rounded-xl ${passwordSaved ? "bg-green-600 hover:bg-green-600" : ""}`} data-testid="button-save-password">
          {passwordSaved ? <><Check className="w-4 h-4 mr-2" /> O'zgartirildi!</> : "O'zgartirish"}
        </Button>
      </motion.div>

      {/* Work Days + Hours */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Ish kunlari va vaqti</h3>
        </div>
        <p className="text-xs text-muted-foreground">Ish kunlari va ish soatlarini belgilang. Dam olish kunlarida yoki ish vaqtidan tashqarida foydalanuvchilar xabar ko'radi.</p>
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
        <div className="pt-2 border-t border-border/40 space-y-3">
          <p className="text-sm font-medium">Ish soatlari</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Ochilish vaqti</label>
              <Input
                type="time"
                value={workStart}
                onChange={e => setWorkStart(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Yopilish vaqti</label>
              <Input
                type="time"
                value={workEnd}
                onChange={e => setWorkEnd(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Hozirgi sozlama: <span className="font-semibold text-foreground">{workStart} — {workEnd}</span>
          </p>
        </div>
        <Button onClick={handleSaveWorkDays} disabled={workDaysLoading} className={`w-full rounded-xl ${workDaysSaved ? "bg-green-600 hover:bg-green-600" : ""}`} data-testid="button-save-work-days">
          {workDaysSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>
    </div>
  );
}
