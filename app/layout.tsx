import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Showroom CRM", template: "%s | Showroom CRM" },
  description: "Vehicle showroom leads, follow-ups and branch operations.",
  applicationName: "Showroom CRM",
  appleWebApp: { capable: true, title: "Showroom", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1015" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-on-primary"
        >
          Skip to content
        </a>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
