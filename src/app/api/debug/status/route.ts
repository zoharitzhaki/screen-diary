import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

// נתיב אבחון זמני: עוזר לוודא שהשרת בפרודקשן באמת מחובר ל-Turso (ולא נופל
// בטעות לקובץ SQLite מקומי, שנעלם בין דיפלוי לדיפלוי בסביבת Vercel), ומראה
// כמה כותרים קיימים בפועל וכמה מהם הוכנסו לאחרונה. מוגן ע"י אותה מידלוור
// סיסמה כמו כל שאר האפליקציה (לא ב-PUBLIC_PATHS). למחוק אחרי האבחון.
export async function GET() {
  await ensureSchema();

  const [titlesResult, watchResult, creditsResult, favoritesResult] = await Promise.all([
    db.execute("SELECT id, name, media_type, created_at FROM titles ORDER BY id DESC LIMIT 15"),
    db.execute("SELECT id, title_id, year, month, day, created_at FROM watch_events ORDER BY id DESC LIMIT 10"),
    db.execute("SELECT id, title_id, name, role, sort_order FROM credits ORDER BY id DESC LIMIT 10"),
    db.execute("SELECT person_tmdb_id, created_at FROM favorite_people ORDER BY created_at DESC LIMIT 10"),
  ]);

  return NextResponse.json({
    usingTurso: Boolean(process.env.TURSO_DATABASE_URL),
    dbUrlPreview: process.env.TURSO_DATABASE_URL
      ? process.env.TURSO_DATABASE_URL.slice(0, 20) + "..."
      : "file:./local.db (fallback)",
    recentTitles: titlesResult.rows.map((r) => ({
      id: r["id"],
      name: r["name"],
      media_type: r["media_type"],
      created_at: r["created_at"],
    })),
    recentWatchEvents: watchResult.rows.map((r) => ({
      id: r["id"],
      title_id: r["title_id"],
      date: `${r["year"]}-${r["month"]}-${r["day"]}`,
      created_at: r["created_at"],
    })),
    recentCredits: creditsResult.rows.map((r) => ({
      id: r["id"],
      title_id: r["title_id"],
      name: r["name"],
      role: r["role"],
      sort_order: r["sort_order"],
    })),
    recentFavoritePeople: favoritesResult.rows.map((r) => ({
      person_tmdb_id: r["person_tmdb_id"],
      created_at: r["created_at"],
    })),
    serverTimeUtc: new Date().toISOString(),
  });
}
