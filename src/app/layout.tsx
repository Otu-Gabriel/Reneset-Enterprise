import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/theme.css";
import { Providers } from "./providers";
import { getSystemSettings } from "@/lib/settings";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettings();
  const companyName = settings.companyName || "GabyGod Technologies";
  const faviconUrl = settings.faviconUrl;

  return {
    title: `${companyName} - Inventory Management System`,
    description: "Professional inventory management system",
    icons: faviconUrl
      ? {
          icon: [
            { url: `/api/favicon?t=${Date.now()}`, type: "image/x-icon" },
          ],
        }
      : {
          icon: "/favicon.ico",
        },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { uiFontScale } = await getSystemSettings();
  const fontPercent = Math.min(120, Math.max(75, uiFontScale));

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ fontSize: `${fontPercent}%` }}
    >
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

