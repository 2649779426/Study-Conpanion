import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { StoreShell } from "@/components/StoreShell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "考研督学数字人",
  description: "考研学习计划、进度督导与数字人播报陪伴",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <StoreShell>{children}</StoreShell>
      </body>
    </html>
  );
}
