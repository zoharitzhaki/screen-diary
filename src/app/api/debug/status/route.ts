import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

// נתיב אבחון זמני: עוזר לוודא שהשרת בפרודקשן באמת מחובר ל-Turso (ולא נופל
// בטעות לקובץ SQLite מקומי, שנעלם בין דיפלוי לדיפלוי בסביבת Vercel), ומראה
// כמה כותרים קיימים בפועל וכמה מהם הוכנסו לאחרונה. מוגן ע"י אותה מידלוור
// סיסמה כמו כל שאר האפליקציה (לא ב-PUBLIC_PATHS). למחוק אחרי האבחון.
export async function GET() {
  await ensureSchema();

  const titlesResult = await db.execute(
    "SELECT id, name, media_type, created_at FROM titles ORDER BY id DESC LIMIT 15",
  );

  return NextResponse.json({
    usingTurso: Boolean(process.env.TURSO_DATABASE_URL),
    dbUrlPreview: process.env.TURSO_DATABASE_URL
      ? process.env.TURSO_DATABASE_URL.slice(0, 20) + "..."
      : "file:./local.db (fallback)",
    totalTitlesShown: titlesResult.rows.length,
    recentTitles: titlesResult.rows.map((r) => ({
      id: r["id"],
      name: r["name"],
      media_type: r["media_type"],
      created_at: r["created_at"],
    })),
    serverTimeUtc: new Date().toISOString(),
  });
}
