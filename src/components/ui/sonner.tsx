"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Fixed toasts: always visible at the top of the viewport (not inside the scroll area),
 * with a high z-index above the nav/sidebar so feedback stays visible when scrolled.
 */
export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      expand
      richColors
      closeButton
      offset="4.5rem"
      duration={6000}
      className="toaster group"
      style={{ zIndex: 200 }}
      toastOptions={{
        classNames: {
          toast:
            "min-w-[min(100%,22rem)] max-w-md border border-border bg-background/95 text-foreground shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
