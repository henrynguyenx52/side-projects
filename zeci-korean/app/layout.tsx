import type { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Học Bổng Du Học Hàn Quốc | Zeci Korean Scholarships",
  description: "Khám phá và tra cứu học bổng các trường đại học hàng đầu Hàn Quốc theo thành phố: Seoul, Busan, Daegu, Daejeon, Incheon, Gwangju.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-white dark:bg-[#0d1117] text-[#000000] dark:text-[#ffffff] transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
