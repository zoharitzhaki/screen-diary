import { NextRequest } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { RECENCY_ORDER_BY_DESC, type WatchedPrecision } from "@/lib/dates";

// מוסיף עוד תאריך צפייה לכותר קיים (לצפייה חוזרת). בניגוד ליצירת כותר,
// כאן חובה לספק תאריך - אם לא רוצים לתעד תאריך, פשוט לא מוסיפים רשומה.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const body = await request.json();
  const { year, month, day, precision } = body as {
    year?: number;
    month?: number | null;
    day?: number | null;
    precision?: WatchedPrecision;
  };

  if (!year || (precision !== "day" && precision !== "month" && precision !== "year")) {
    return Response.json({ error: "year ו-precision הם שדות חובה" }, { status: 400 });
  }
  if (precision === "month" && !month) {
    return Response.json({ error: "חסר חודש" }, { status: 400 });
  }
  if (precision === "day" && (!month || !day)) {
    return Response.json({ error: "חסר חודש או יום" }, { status: 400 });
  }

  const titleExists = await db.execute({ sql: "SELECT id FROM titles WHERE id = ?", args: [id] });
  if (titleExists.rows.length === 0) {
    return Response.json({ error: "לא נמצא" }, { status: 404 });
  }

  const insertResult = await db.execute({
    sql: `INSERT INTO watch_events (title_id, year, month, day, precision) VALUES (?, ?, ?, ?, ?)`,
    args: [id, year, month ?? null, precision === "day" ? (day ?? null) : null, precision],
  });

  return Response.json({ id: Number(insertResult.lastInsertRowid) }, { status: 201 });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const result = await db.execute({
    sql: `SELECT * FROM watch_events WHERE title_id = ? ORDER BY ${RECENCY_ORDER_BY_DESC}`,
    args: [id],
  });
  const watches = result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of result.columns) obj[col] = row[col];
    return obj;
  });
  return Response.json({ watches });
}
