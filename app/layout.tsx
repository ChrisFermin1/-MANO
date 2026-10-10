import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { LanguageProvider } from "@/context/LanguageContext";
import BottomNav from "@/components/BottomNav";
import UserHeader from "@/components/UserHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mano",
  description: "AI job assistant for contractors",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-gray-900">
        <Auth0Provider>
          <LanguageProvider>
            <UserHeader />
            {children}
            <BottomNav />
          </LanguageProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
