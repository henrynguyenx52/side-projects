import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CustomThemeProvider from "./theme-provider";
import LoadingProvider from "./components/LoadingProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZECI - Nền tảng học TOEIC hiệu quả",
  description:
    "Luyện tập theo lộ trình cá nhân hóa, đạt mục tiêu 800+ TOEIC dễ dàng",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <CustomThemeProvider>
          <LoadingProvider>{children}</LoadingProvider>
        </CustomThemeProvider>
      </body>
    </html>
  );
}
