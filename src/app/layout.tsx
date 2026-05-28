import type { Metadata } from "next";
import { Playfair_Display, Lora, Inter } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-apercu",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OTA Analyzer — Multi-State Log Analysis Dashboard",
  description: "Vehicle OTA update analytics dashboard with state transition flows, pipeline funnels, retry analysis, and data waste tracking. Supports custom CSV/TSV/JSON file upload.",
  keywords: ["OTA", "over-the-air", "vehicle analytics", "log analysis", "state machine", "dashboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfairDisplay.variable} ${lora.variable} ${inter.variable} font-sans antialiased bg-background text-ink`}
      >
        {children}
      </body>
    </html>
  );
}
