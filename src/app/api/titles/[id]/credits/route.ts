import { NextRequest } from "next/server";
import { db, ensureSchema } from "@/lib/db";

// מוסיף קרדיט (שחקן/ית או במאי/ית) לכותר באופן ידני, גם אם האדם לא
// מופיע ברשימת הקאסט שמגיעה מ-TMDb. זה נחוץ בעיקר לסדרות עם כמה עונות:
// TMDb מחזיר בד"כ רק את הקאסט של העונה האחרונה, אז שחקן/ית שהופיע/ה
// בעונה מוקדמת יותר ופרש/ה לא יופיע/ה שם בכלל.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const body = await request.json();

  const personId = Number(body.personId);
  const name = typeof body.name === "string" ? body.name : null;
  const profilePath = typeof body.profilePath === "string" ? body.profilePath : null;
  const role = body.role === "crew" ? "crew" : "cast";
  const characterName = typeof body.characterName === "string" && body.characterName.trim() ? body.characterName.trim() : null;
  const job = typeof body.job === "string" && body.job.trim() ? body.job.trim() : null;

  if (!personId || !name) {
    return Response.json({ error: "חסר מזהה אדם או שם" }, { status: 400 });
  }

  // מונעים הוספה כפולה של אותו אדם באותו תפקיד לאותו כותר.
  const existing = await db.execute({
    sql: "SELECT id FROM credits WHERE title_id = ? AND person_tmdb_id = ? AND role = ?",
    args: [id, personId, role],
  });
  if (existing.rows.length > 0) {
    return Response.json({ ok: true, alreadyExists: true });
  }

  // sort_order גבוה במיוחד כדי שקרדיטים שהוספתם ידנית יופיעו בסוף רשימת
  // הקאסט/הבמאים הרגילה (שממוינת לפי סדר הופעה ב-TMDb), ולא יקפצו קדימה.
  await db.execute({
    sql: `INSERT INTO credits (title_id, person_tmdb_id, name, role, job, character_name, profile_path, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1000)`,
    args: [id, personId, name, role, role === "crew" ? job : null, role === "cast" ? characterName : null, profilePath],
  });

  return Response.json({ ok: true });
}
