import type { Metadata } from "next";
import "./globals.css";

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
    <html className="h-full antialiased" lang="es">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
