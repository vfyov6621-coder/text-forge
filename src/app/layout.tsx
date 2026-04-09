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
  title: "Суммаризатор текста — AI-пересказ",
  description: "Быстрый и точный пересказ текста с настраиваемым уровнем сжатия. Работает на базе искусственного интеллекта.",
  keywords: ["суммаризатор", "пересказ текста", "AI", "ИИ", "сжатие текста"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Суммаризатор текста",
    description: "Быстрый и точный пересказ текста с настраиваемым уровнем сжатия",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Суммаризатор текста",
    description: "Быстрый и точный пересказ текста с настраиваемым уровнем сжатия",
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
