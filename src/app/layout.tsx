import '@/lib/ai/bootstrap';
import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";

// ─── Typography ───
// Inter handles body, UI and numeric-heavy surfaces (prices, KPIs).
// Instrument Serif is reserved for editorial display — only landing heroes,
// storefront section titles and empty-state headlines. Never for body copy.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
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
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
      lang="es"
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <AnalyticsScripts />
      </body>
    </html>
  );
}
