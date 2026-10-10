import type { Metadata, Viewport } from "next";
import { Hedvig_Letters_Serif, JetBrains_Mono, Montserrat, Righteous } from "next/font/google";
import { ApprovalToast } from "@/components/approval-toast";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const righteous = Righteous({ variable: "--font-righteous", weight: "400", subsets: ["latin"] });
const hedvig = Hedvig_Letters_Serif({ variable: "--font-hedvig", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MANO",
  description: "Tú hablas, Mano escribe.",
};

export const viewport: Viewport = {
  themeColor: "#0f3d2e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body
        className={`${montserrat.variable} ${righteous.variable} ${hedvig.variable} ${jetbrains.variable} antialiased`}
      >
        <LangProvider>
          {children}
          <ApprovalToast />
        </LangProvider>
      </body>
    </html>
  );
}
