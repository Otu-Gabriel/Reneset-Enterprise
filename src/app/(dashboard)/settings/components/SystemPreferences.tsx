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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function SystemPreferences() {
  const {
    settings,
    loading: settingsLoading,
    updateSettings,
  } = useSystemSettings();
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    currency: "USD",
    language: "en",
  });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setPreferences({
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        currency: settings.currency,
        language: settings.language,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const result = await updateSettings(preferences);
      if (result.success) {
        setMessage({ type: "success", text: "Preferences saved successfully" });
        setTimeout(() => setMessage(null), 3000);
        // Clear cache to force refresh
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to save preferences",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save preferences" });
    } finally {
      setSaving(false);
    }
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
      {/* Message Alert */}
      {message && (
        <Card
          className={
            message.type === "success"
              ? "bg-green-500/10 border-green-500"
              : "bg-red-500/10 border-red-500"
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : null}
              <p
                className={
                  message.type === "success" ? "text-green-600" : "text-red-600"
                }
              >
                {message.text}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </div>
    </div>
  );
}
