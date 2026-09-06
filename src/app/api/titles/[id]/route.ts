import { NextRequest } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { RECENCY_ORDER_BY_DESC } from "@/lib/dates";

function rowToObject(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const col of columns) obj[col] = row[col];
  return obj;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const titleResult = await db.execute({ sql: "SELECT * FROM titles WHERE id = ?", args: [id] });
  const titleRow = titleResult.rows[0];
  if (!titleRow) {
    return Response.json({ error: "לא נמצא" }, { status: 404 });
  }
  const creditsResult = await db.execute({
    sql: "SELECT * FROM credits WHERE title_id = ? ORDER BY role ASC, sort_order ASC",
    args: [id],
  });
  const watchesResult = await db.execute({
    sql: `SELECT * FROM watch_events WHERE title_id = ? ORDER BY ${RECENCY_ORDER_BY_DESC}`,
    args: [id],
  });
  const title = rowToObject(titleRow, titleResult.columns);
  const credits = creditsResult.rows.map((row) => rowToObject(row, creditsResult.columns));
  const watches = watchesResult.rows.map((row) => rowToObject(row, watchesResult.columns));
  return Response.json({ title, credits, watches });
}

// rating, הערות, ו-favorite (כוכבית "ממש אהבתי") ניתנים לעדכון כאן. תאריכי
// צפייה מנוהלים דרך /api/titles/[id]/watches (הוספה/מחיקה של רשומת צפייה
// בודדת).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const body = await request.json();

  const fields: string[] = [];
  const args: unknown[] = [];
  for (const key of ["rating", "notes", "favorite"] as const) {
    if (key in body) {
      fields.push(`${key} = ?`);
      // favorite נשמר כ-0/1 (SQLite אין לו טיפוס בוליאני אמיתי), גם אם
      // מגיע true/false מהלקוח.
      args.push(key === "favorite" ? (body[key] ? 1 : 0) : body[key]);
    }
  }
  if (fields.length === 0) {
    return Response.json({ error: "אין שדות לעדכן" }, { status: 400 });
  }
  args.push(id);
  await db.execute({ sql: `UPDATE titles SET ${fields.join(", ")} WHERE id = ?`, args });
  return Response.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  await db.execute({ sql: "DELETE FROM titles WHERE id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM credits WHERE title_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM watch_events WHERE title_id = ?", args: [id] });
  return Response.json({ ok: true });
}
