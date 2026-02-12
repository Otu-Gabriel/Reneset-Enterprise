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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

