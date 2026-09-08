import { createClient } from "@libsql/client";

// שימוש ב-|| ולא ב-?? בכוונה: אם TURSO_DATABASE_URL קיים בקובץ .env אבל ריק
// (למשל "TURSO_DATABASE_URL=" בלי ערך), process.env נותן מחרוזת ריקה ולא
// undefined, ו-?? לא היה תופס את זה - היינו מנסים להתחבר לכתובת ריקה.
//
// חשוב: משתני TURSO_DATABASE_URL/TURSO_AUTH_TOKEN הרגילים מנוהלים ע"י
// אינטגרציית Turso הרשמית ב-Vercel. גילינו שבזמן ריצה בפרודקשן הם
// מוחלפים בפועל בכתובת שמתחילה ב-libsql://dpl-... שמשתנה בכל דיפלוי
// חדש ומצביעה על מסד נתונים ריק/ישן - זה גרם לאיפוס הנתונים בכל דיפלוי.
// לכן הוספנו TURSO_DATABASE_URL_STATIC/TURSO_AUTH_TOKEN_STATIC כמשתני
// סביבה רגילים (לא מנוהלים ע"י האינטגרציה) עם הכתובת/טוקן הקבועים של
// מסד הנתונים האמיתי (database-cordovan-pillow), ומעדיפים אותם כאן.
const url =
  process.env.TURSO_DATABASE_URL_STATIC || process.env.TURSO_DATABASE_URL || "file:./local.db";
const authToken =
  process.env.TURSO_AUTH_TOKEN_STATIC || process.env.TURSO_AUTH_TOKEN || undefined;

// בלי TURSO_DATABASE_URL האפליקציה עובדת מול קובץ SQLite מקומי (local.db) -
// נוח לפיתוח, אבל לא נגיש מהטלפון. לפרודקשן חובה Turso (ראה README).
export const db = authToken ? createClient({ url, authToken }) : createClient({ url });

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.batch(
        [
          "PRAGMA foreign_keys = ON",
          `CREATE TABLE IF NOT EXISTS titles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tmdb_id INTEGER NOT NULL,
            media_type TEXT NOT NULL CHECK (media_type IN ('movie','tv')),
            name TEXT NOT NULL,
            poster_path TEXT,
            release_date TEXT,
            overview TEXT,
            rating INTEGER,
            notes TEXT,
            favorite INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(tmdb_id, media_type)
          )`,
          // תאריך/י צפייה נשמרים בטבלה נפרדת: כותר יכול להיות בלי אף רשומה
          // כאן (בחרתם לא לציין תאריך), או עם כמה רשומות (צפייה חוזרת).
          `CREATE TABLE IF NOT EXISTS watch_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
            year INTEGER NOT NULL,
            month INTEGER,
            day INTEGER,
            precision TEXT NOT NULL CHECK (precision IN ('day','month','year')),
            created_at TEXT DEFAULT (datetime('now'))
          )`,
          `CREATE INDEX IF NOT EXISTS idx_watch_events_title ON watch_events(title_id)`,
          // "credits" מחליף את הטבלה הישנה cast_members: מחזיק גם שחקנים
          // וגם צוות (במאים/יוצרים), כדי שאפשר יהיה לקשר בין אדם לכל
          // הכותרים שבהם הוא מופיע. role מבדיל בין 'cast' ל-'crew'; job
          // רלוונטי רק ל-crew (לדוגמה "Director" או "Creator").
          `CREATE TABLE IF NOT EXISTS credits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
            person_tmdb_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('cast','crew')),
            job TEXT,
            character_name TEXT,
            profile_path TEXT,
            sort_order INTEGER
          )`,
          `CREATE INDEX IF NOT EXISTS idx_credits_person ON credits(person_tmdb_id)`,
          // סט האנשים (שחקנים/במאים) שסימנתם כאהובים. אין טבלת "אנשים"
          // נפרדת באפליקציה (השם/התמונה נשאבים בכל פעם מ-credits) - זו
          // בעצם רק רשימת person_tmdb_id שסומנו, קיום שורה = מסומן כאהוב.
          `CREATE TABLE IF NOT EXISTS favorite_people (
            person_tmdb_id INTEGER PRIMARY KEY,
            created_at TEXT DEFAULT (datetime('now'))
          )`,
        ],
        "write",
      );

      // מיגרציה קלה: אם טבלת titles כבר קיימת מלפני שהוספנו את favorite,
      // ה-CREATE TABLE IF NOT EXISTS למעלה לא מוסיף לה את העמודה בעצמו.
      // בודקים אם היא כבר שם, ואם לא - מוסיפים אותה עם ALTER TABLE.
      const columns = await db.execute("PRAGMA table_info(titles)");
      const hasFavorite = columns.rows.some((c) => c["name"] === "favorite");
      if (!hasFavorite) {
        await db.execute("ALTER TABLE titles ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0");
      }
    })();
  }
  return schemaReady;
}
