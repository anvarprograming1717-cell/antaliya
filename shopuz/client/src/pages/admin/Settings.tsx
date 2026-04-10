import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, MessageSquare, Lock, Check, Globe, ImageIcon } from "lucide-react";
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
            <Input
              value={siteForm.siteName}
              onChange={e => setSiteForm(f => ({ ...f, siteName: e.target.value }))}
              placeholder="ShopUz"
              className="pl-9 rounded-xl"
              data-testid="input-site-name"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Logotip URL</label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={siteForm.logoUrl}
              onChange={e => setSiteForm(f => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://example.com/logo.png"
              className="pl-9 rounded-xl"
              data-testid="input-logo-url"
            />
          </div>
          {siteForm.logoUrl && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={siteForm.logoUrl}
                alt="Logo preview"
                className="w-12 h-12 rounded-xl object-contain border border-border bg-muted/30"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <p className="text-xs text-muted-foreground">Logo ko'rinishi</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSaveSite}
          disabled={updateSite.isPending}
          className={`w-full rounded-xl ${siteSaved ? "bg-green-600 hover:bg-green-600" : ""}`}
          data-testid="button-save-site"
        >
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
            <Input
              value={contactForm.phone}
              onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
              className="pl-9 rounded-xl"
              data-testid="input-support-phone"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Telegram username</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={contactForm.telegram}
              onChange={e => setContactForm(f => ({ ...f, telegram: e.target.value }))}
              placeholder="@username"
              className="pl-9 rounded-xl"
              data-testid="input-support-telegram"
            />
          </div>
        </div>
        <Button
          onClick={handleSaveContact}
          disabled={updateContact.isPending}
          className={`w-full rounded-xl ${contactSaved ? "bg-green-600 hover:bg-green-600" : ""}`}
          data-testid="button-save-contact"
        >
          {contactSaved ? <><Check className="w-4 h-4 mr-2" /> Saqlandi!</> : "Saqlash"}
        </Button>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <h3 className="font-bold">Parolni o'zgartirish</h3>
        <div>
          <label className="text-sm font-medium block mb-1">Joriy parol</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="pl-9 rounded-xl"
              data-testid="input-current-password"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Yangi parol</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
              className="pl-9 rounded-xl"
              data-testid="input-new-password"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Yangi parolni tasdiqlash</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="pl-9 rounded-xl"
              data-testid="input-confirm-password"
            />
          </div>
        </div>
        {passwordError && <p className="text-destructive text-sm" data-testid="text-password-error">{passwordError}</p>}
        <Button
          onClick={handleSavePassword}
          disabled={!passwordForm.currentPassword || !passwordForm.newPassword || updatePassword.isPending}
          className={`w-full rounded-xl ${passwordSaved ? "bg-green-600 hover:bg-green-600" : ""}`}
          data-testid="button-save-password"
        >
          {passwordSaved ? <><Check className="w-4 h-4 mr-2" /> O'zgartirildi!</> : "O'zgartirish"}
        </Button>
      </motion.div>
    </div>
  );
}
