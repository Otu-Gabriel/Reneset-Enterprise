"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Image as ImageIcon } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const UI_FONT_SCALE_OPTIONS: { value: string; label: string }[] = [
  { value: "75", label: "75% — Minimum" },
  { value: "80", label: "80% — Very compact" },
  { value: "85", label: "85% — Compact" },
  { value: "90", label: "90% — Slightly smaller (default)" },
  { value: "95", label: "95% — Balanced" },
  { value: "100", label: "100% — Browser default" },
  { value: "105", label: "105% — Slightly larger" },
  { value: "110", label: "110% — Large" },
  { value: "115", label: "115% — Very large" },
  { value: "120", label: "120% — Largest" },
];

export function SystemPreferences() {
  const router = useRouter();
  const {
    settings,
    loading: settingsLoading,
    updateSettings,
  } = useSystemSettings();
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    companyName: "GabyGod Technologies",
    logoUrl: null as string | null,
    faviconUrl: null as string | null,
    businessAddress: null as string | null,
    businessPhone: null as string | null,
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    currency: "USD",
    language: "en",
    uiFontScale: 90,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setPreferences({
        companyName: settings.companyName || "GabyGod Technologies",
        logoUrl: settings.logoUrl || null,
        faviconUrl: settings.faviconUrl || null,
        businessAddress: settings.businessAddress || null,
        businessPhone: settings.businessPhone || null,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        currency: settings.currency,
        language: settings.language,
        uiFontScale: settings.uiFontScale,
      });
      setLogoPreview(settings.logoUrl || null);
      setFaviconPreview(settings.faviconUrl || null);
    }
  }, [settings]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file", {
          description: "Please select an image file (PNG, JPG, or similar).",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Logo must be 5MB or less.",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file", {
          description: "Please select an image file for the favicon.",
        });
        return;
      }
      // Validate file size (max 1MB for favicon)
      if (file.size > 1 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Favicon must be 1MB or less.",
        });
        return;
      }
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return preferences.logoUrl;

    try {
      setUploadingLogo(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", logoFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      } else {
        throw new Error("Failed to upload logo");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Upload failed", {
        description: "We couldn’t upload the logo. Check your connection and try again.",
      });
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const uploadFavicon = async (): Promise<string | null> => {
    if (!faviconFile) return preferences.faviconUrl;

    try {
      setUploadingFavicon(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", faviconFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      } else {
        throw new Error("Failed to upload favicon");
      }
    } catch (error) {
      console.error("Error uploading favicon:", error);
      toast.error("Upload failed", {
        description: "We couldn’t upload the favicon. Check your connection and try again.",
      });
      return null;
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Upload logo if new file selected
      let logoUrl = preferences.logoUrl;
      if (logoFile) {
        const uploadedLogoUrl = await uploadLogo();
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl;
        } else {
          setSaving(false);
          return;
        }
      }

      // Upload favicon if new file selected
      let faviconUrl = preferences.faviconUrl;
      if (faviconFile) {
        const uploadedFaviconUrl = await uploadFavicon();
        if (uploadedFaviconUrl) {
          faviconUrl = uploadedFaviconUrl;
        } else {
          setSaving(false);
          return;
        }
      }

      const result = await updateSettings({
        ...preferences,
        logoUrl,
        faviconUrl,
      });

      if (result.success) {
        toast.success("Settings saved", {
          description: "Your system preferences have been updated.",
        });
        // Clear file selections
        setLogoFile(null);
        setFaviconFile(null);
        // Refresh the page to show updated settings
        router.refresh();
      } else {
        toast.error("Couldn’t save settings", {
          description: result.error || "Something went wrong. Try again.",
        });
      }
    } catch (error) {
      toast.error("Couldn’t save settings", {
        description: "An unexpected error occurred. Try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setPreferences({ ...preferences, logoUrl: null });
  };

  const removeFavicon = () => {
    setFaviconFile(null);
    setFaviconPreview(null);
    setPreferences({ ...preferences, faviconUrl: null });
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Branding */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
          <CardDescription>
            Customize your company name, logo, and favicon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={preferences.companyName}
              onChange={(e) =>
                setPreferences({ ...preferences, companyName: e.target.value })
              }
              placeholder="GabyGod Technologies"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Company Logo</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, max 5MB (PNG, JPG, SVG)
                </p>
              </div>
              {(logoPreview || preferences.logoUrl) && (
                <div className="relative">
                  <div className="w-24 h-24 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {logoPreview || preferences.logoUrl ? (
                      <Image
                        src={logoPreview || preferences.logoUrl || ""}
                        alt="Logo preview"
                        width={96}
                        height={96}
                        className="object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={removeLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="favicon">Favicon</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    id="favicon"
                    type="file"
                    accept="image/*"
                    onChange={handleFaviconChange}
                    disabled={uploadingFavicon}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 32x32 or 16x16 pixels, max 1MB (ICO, PNG)
                </p>
              </div>
              {(faviconPreview || preferences.faviconUrl) && (
                <div className="relative">
                  <div className="w-16 h-16 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {faviconPreview || preferences.faviconUrl ? (
                      <Image
                        src={faviconPreview || preferences.faviconUrl || ""}
                        alt="Favicon preview"
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={removeFavicon}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Set your business address and contact information (used on receipts)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessAddress">Business Address</Label>
            <Textarea
              id="businessAddress"
              value={preferences.businessAddress || ""}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  businessAddress: e.target.value || null,
                })
              }
              placeholder="Suhum, Eastern Region"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessPhone">Business Phone</Label>
            <Input
              id="businessPhone"
              value={preferences.businessPhone || ""}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  businessPhone: e.target.value || null,
                })
              }
              placeholder="0546880541 / 0550127317"
            />
            <p className="text-xs text-muted-foreground">
              You can enter multiple numbers separated by " / "
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time Format */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Date & Time Format</CardTitle>
          <CardDescription>
            Customize how dates and times are displayed throughout the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <Select
              value={preferences.dateFormat}
              onValueChange={(value) =>
                setPreferences({ ...preferences, dateFormat: value })
              }
            >
              <SelectTrigger id="dateFormat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                <SelectItem value="DD MMM YYYY">DD MMM YYYY (Text)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeFormat">Time Format</Label>
            <Select
              value={preferences.timeFormat}
              onValueChange={(value) =>
                setPreferences({ ...preferences, timeFormat: value })
              }
            >
              <SelectTrigger id="timeFormat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Currency & Language */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
          <CardDescription>
            Set your preferred currency and language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={preferences.currency}
              onValueChange={(value) =>
                setPreferences({ ...preferences, currency: value })
              }
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                <SelectItem value="NGN">NGN - Nigerian Naira (₦)</SelectItem>
                <SelectItem value="GHS">GHS - Ghana Cedis (₵)</SelectItem>
                <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                <SelectItem value="CNY">CNY - Chinese Yuan (¥)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={preferences.language}
              onValueChange={(value) =>
                setPreferences({ ...preferences, language: value })
              }
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* UI density — root rem scale (all users) */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Interface & density</CardTitle>
          <CardDescription>
            Adjust app-wide text size. This scales the whole interface proportionally
            for everyone. Changes apply after you save and the page reloads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uiFontScale">Text / UI size</Label>
            <Select
              value={String(preferences.uiFontScale)}
              onValueChange={(value) =>
                setPreferences({
                  ...preferences,
                  uiFontScale: parseInt(value, 10),
                })
              }
            >
              <SelectTrigger id="uiFontScale" className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!UI_FONT_SCALE_OPTIONS.some(
                  (o) => o.value === String(preferences.uiFontScale)
                ) ? (
                  <SelectItem value={String(preferences.uiFontScale)}>
                    {preferences.uiFontScale}% (current)
                  </SelectItem>
                ) : null}
                {UI_FONT_SCALE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground max-w-md">
              Uses the browser’s base size (usually 16px) as 100%. Lower values
              make tables and forms more compact; higher values improve readability.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage how you receive notifications (Coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Email notifications, SMS alerts, and push notifications will be
            available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || uploadingLogo || uploadingFavicon}>
          {saving || uploadingLogo || uploadingFavicon ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadingLogo ? "Uploading logo..." : uploadingFavicon ? "Uploading favicon..." : "Saving..."}
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </div>
    </div>
  );
}
