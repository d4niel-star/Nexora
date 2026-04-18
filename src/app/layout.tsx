import '@/lib/ai/bootstrap';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";

// ─── Typography ───
// Nexora ships a single sans-serif (Inter) across the entire product. The
// `--font-display` token aliases Inter so `font-display` utilities render
// with tight tracking instead of a second typeface.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nexora",
  description: "Nexora admin workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${inter.variable} h-full antialiased`}
      lang="es"
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <AnalyticsScripts />
      </body>
    </html>
  );
}
