import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "יומן מסך",
  description: "אפליקציה אישית למעקב אחרי סרטים וסדרות שצפיתי בהם",
  // מאפשר "הוספה למסך הבית" באייפון שתיפתח כמו אפליקציה אמיתית, בלי
  // סרגל הכתובת של הדפדפן (באנדרואיד/כרום זה מגיע מ-manifest.ts).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "יומן מסך",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <header className="border-b border-neutral-800 px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-xl font-semibold">
            יומן מסך
          </Link>
          <Link href="/add" className="text-sm text-neutral-400 hover:text-neutral-100">
            + הוספת כותר
          </Link>
          <Link href="/people" className="text-sm text-neutral-400 hover:text-neutral-100">
            שחקנים ובמאים
          </Link>
        </header>
        <main className="px-6 py-8 max-w-5xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
