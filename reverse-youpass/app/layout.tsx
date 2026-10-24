import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });
const serif = Source_Serif_4({ subsets: ["latin", "vietnamese"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Reading practice",
  description: "A split-screen reading practice test with a timer, passage navigation, and mixed question types.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
