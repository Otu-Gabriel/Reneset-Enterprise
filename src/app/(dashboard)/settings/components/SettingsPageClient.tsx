"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "./ProfileSettings";
import { AccountInformation } from "./AccountInformation";
import { SystemPreferences } from "./SystemPreferences";

interface SettingsPageClientProps {
  canViewAccountInfo: boolean;
  canManageSystemSettings: boolean;
}

export function SettingsPageClient({
  canViewAccountInfo,
  canManageSystemSettings,
}: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState("profile");

  // Build tabs list based on permissions
  const tabs = [
    { value: "profile", label: "Profile" },
    ...(canViewAccountInfo ? [{ value: "account", label: "Account" }] : []),
    ...(canManageSystemSettings
      ? [{ value: "preferences", label: "System Preferences" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-xl">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your profile and account settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className={
            tabs.length === 1
              ? "grid w-full grid-cols-1"
              : tabs.length === 2
              ? "grid w-full grid-cols-2"
              : "grid w-full grid-cols-3"
          }
        >
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        {canViewAccountInfo && (
          <TabsContent value="account" className="mt-6">
            <AccountInformation />
          </TabsContent>
        )}

        {canManageSystemSettings && (
          <TabsContent value="preferences" className="mt-6">
            <SystemPreferences />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

