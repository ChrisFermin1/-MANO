import type { Metadata, Viewport } from "next";
import { Hedvig_Letters_Serif, JetBrains_Mono, Montserrat, Righteous } from "next/font/google";
import { Suspense } from "react";
import { ApprovalToast } from "@/components/approval-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGate } from "@/components/auth-gate";
import { RelaySync } from "@/components/relay-sync";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const righteous = Righteous({ variable: "--font-righteous", weight: "400", subsets: ["latin"] });
const hedvig = Hedvig_Letters_Serif({ variable: "--font-hedvig", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MANO",
  description: "Tú hablas, Mano escribe.",
  // iPhone "Add to Home Screen": opens full screen with its own name. "default" = a normal light bar with a
  // dark clock, content starts below it. ("black-translucent" put a white clock over the now-light pages, and
  // the saved app jumped on the first scroll while iOS caught up on the bar's height.)
  appleWebApp: { capable: true, title: "mano", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f5f5ed", // ivory, the app's background (Safari tints its bars with it)
  // draw behind the iPhone's clock and battery (each screen pads itself with the safe-area insets)
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body
        className={`${montserrat.variable} ${righteous.variable} ${hedvig.variable} ${jetbrains.variable} antialiased`}
      >
        <LangProvider>
          <Suspense>
            <AppSidebar />
          </Suspense>
          <AuthGate>{children}</AuthGate>
          <ApprovalToast />
          <RelaySync />
        </LangProvider>
      </body>
    </html>
  );
}
