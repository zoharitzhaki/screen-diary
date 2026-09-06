import { NextRequest } from "next/server";
import { db, ensureSchema } from "@/lib/db";

// מוחק רשומת צפייה בודדת (למשל אם נוספה בטעות). אין צורך לוודא שנשארת
// לפחות רשומה אחת - כותר יכול להיות לגמרי בלי תאריך צפייה, זה מצב תקין.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; watchId: string }> },
) {
  await ensureSchema();
  const { id, watchId } = await params;
  await db.execute({
    sql: "DELETE FROM watch_events WHERE id = ? AND title_id = ?",
    args: [watchId, id],
  });
  return Response.json({ ok: true });
}
