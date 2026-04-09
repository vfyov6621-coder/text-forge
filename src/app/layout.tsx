import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TextForge — AI Суммаризатор ссылок",
  description: "Десктопное приложение для суммаризации веб-страниц с выбором AI-модели",
  keywords: ["суммаризатор", "TextForge", "AI", "ИИ", "пересказ", "ссылки", "веб-страницы"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "TextForge — AI Суммаризатор ссылок",
    description: "Десктопное приложение для суммаризации веб-страниц с выбором AI-модели",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TextForge — AI Суммаризатор ссылок",
    description: "Десктопное приложение для суммаризации веб-страниц с выбором AI-модели",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
