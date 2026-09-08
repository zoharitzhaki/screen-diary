import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { db, ensureSchema } from "@/lib/db";
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

// סופר לתצוגה בכותרת העליונה בלבד (כמה כותרים / כמה שחקנים-במאים יש בסך
// הכל) - לא חלק מהותי מהאפליקציה, אז נכשל בשקט (מציג 0) במקום להפיל את כל
// הדף אם יש בעיה זמנית בגישה למסד הנתונים.
async function getHeaderCounts(): Promise<{ titleCount: number; personCount: number }> {
  try {
    await ensureSchema();
    const [titlesResult, peopleResult] = await Promise.all([
      db.execute("SELECT COUNT(*) AS c FROM titles"),
      db.execute(
        `SELECT COUNT(*) AS c FROM (
           SELECT person_tmdb_id FROM credits
           UNION
           SELECT person_tmdb_id FROM favorite_people
         )`,
      ),
    ]);
    return {
      titleCount: Number(titlesResult.rows[0]?.["c"] ?? 0),
      personCount: Number(peopleResult.rows[0]?.["c"] ?? 0),
    };
  } catch {
    return { titleCount: 0, personCount: 0 };
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { titleCount, personCount } = await getHeaderCounts();
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <header className="border-b border-neutral-800 px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/" className="text-xl font-semibold">
            יומן מסך
          </Link>
          {titleCount > 0 && (
            <span className="text-xs text-neutral-500">
              {titleCount} {titleCount === 1 ? "כותר" : "כותרים"}
            </span>
          )}
          <Link href="/add" className="text-sm text-neutral-400 hover:text-neutral-100">
            + הוספת כותר
          </Link>
          <Link href="/people" className="text-sm text-neutral-400 hover:text-neutral-100">
            שחקנים ובמאים
            {personCount > 0 && (
              <span className="text-neutral-500"> ({personCount})</span>
            )}
          </Link>
        </header>
        <main className="px-6 py-8 max-w-5xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
