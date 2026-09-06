import { NextRequest } from "next/server";
import { db, ensureSchema } from "@/lib/db";

// מסמן/מבטל סימון "אהוב" לשחקן/ית או במאי/ית לפי person_tmdb_id. אין
// טבלת אנשים משלנו לעדכן (השם/התמונה תמיד נשאבים מ-credits) - זו רק
// הוספה/הסרה של שורה בטבלת favorite_people.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> },
) {
  await ensureSchema();
  const { personId } = await params;
  const body = await request.json();
  const favorite = Boolean(body.favorite);

  if (favorite) {
    await db.execute({
      sql: "INSERT INTO favorite_people (person_tmdb_id) VALUES (?) ON CONFLICT(person_tmdb_id) DO NOTHING",
      args: [personId],
    });
  } else {
    await db.execute({ sql: "DELETE FROM favorite_people WHERE person_tmdb_id = ?", args: [personId] });
  }

  return Response.json({ ok: true });
}
