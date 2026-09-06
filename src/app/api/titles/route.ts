import { NextRequest } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { getMovieCredits, getMovieDetails, getTvCredits, getTvDetails } from "@/lib/tmdb";
import type { WatchedPrecision } from "@/lib/dates";

type NormalizedCrew = { id: number; name: string; profile_path: string | null; job: string };

type WatchedInput = {
  year: number;
  month?: number | null;
  day?: number | null;
  precision: WatchedPrecision;
} | null;

function validateWatched(watched: unknown): { ok: true; value: WatchedInput } | { ok: false; error: string } {
  if (watched === null || watched === undefined) return { ok: true, value: null };
  const w = watched as { year?: number; month?: number | null; day?: number | null; precision?: WatchedPrecision };
  if (!w.year || (w.precision !== "day" && w.precision !== "month" && w.precision !== "year")) {
    return { ok: false, error: "watched.year ו-watched.precision הם שדות חובה כשיש watched" };
  }
  if (w.precision === "month" && !w.month) return { ok: false, error: "חסר חודש" };
  if (w.precision === "day" && (!w.month || !w.day)) return { ok: false, error: "חסר חודש או יום" };
  return { ok: true, value: { year: w.year, month: w.month ?? null, day: w.day ?? null, precision: w.precision } };
}

export async function GET() {
  await ensureSchema();
  const result = await db.execute("SELECT * FROM titles ORDER BY id DESC");
  // ה-Row של libsql הוא לא אובייקט JS רגיל, אז ממפים אותו במפורש כדי
  // שה-JSON שחוזר יהיה תקין וצפוי.
  const titles = result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of result.columns) obj[col] = row[col];
    return obj;
  });
  return Response.json({ titles });
}

// שולף פרטים + קרדיטים ומחזיר צורה אחידה, בלי צורך ב-type casting מסוכן בין
// הצורה של סרט (title/release_date) לצורה של סדרה (name/first_air_date).
// לסרט: הבמאי/ים מגיעים מתוך crew (job === "Director"). לסדרה אין "במאי"
// אחד לכל הסדרה (לכל פרק יש במאי משלו) - התחליף הכי קרוב שיש ב-TMDb הוא
// created_by (יוצר/ת הסדרה), ולכן מתויג job: "Creator" במקום "Director".
async function fetchNormalizedDetails(mediaType: "movie" | "tv", tmdbId: number) {
  if (mediaType === "movie") {
    const [details, credits] = await Promise.all([getMovieDetails(tmdbId), getMovieCredits(tmdbId)]);
    const directors: NormalizedCrew[] = credits.crew
      .filter((c) => c.job === "Director")
      .map((c) => ({ id: c.id, name: c.name, profile_path: c.profile_path, job: "Director" }));
    return {
      name: details.title,
      releaseDate: details.release_date,
      posterPath: details.poster_path,
      overview: details.overview,
      cast: credits.cast,
      directors,
    };
  }
  const [details, credits] = await Promise.all([getTvDetails(tmdbId), getTvCredits(tmdbId)]);
  const directors: NormalizedCrew[] = (details.created_by ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    profile_path: c.profile_path,
    job: "Creator",
  }));
  return {
    name: details.name,
    releaseDate: details.first_air_date,
    posterPath: details.poster_path,
    overview: details.overview,
    cast: credits.cast,
    directors,
  };
}

export async function POST(request: NextRequest) {
  await ensureSchema();
  const body = await request.json();
  const { tmdb_id, media_type, watched, rating, notes } = body as {
    tmdb_id?: number;
    media_type?: "movie" | "tv";
    watched?: WatchedInput;
    rating?: number | null;
    notes?: string | null;
  };

  if (!tmdb_id || (media_type !== "movie" && media_type !== "tv")) {
    return Response.json({ error: "tmdb_id ו-media_type הם שדות חובה" }, { status: 400 });
  }
  const watchedCheck = validateWatched(watched);
  if (!watchedCheck.ok) {
    return Response.json({ error: watchedCheck.error }, { status: 400 });
  }
  const watchedValue = watchedCheck.value;

  let normalized: Awaited<ReturnType<typeof fetchNormalizedDetails>>;
  try {
    normalized = await fetchNormalizedDetails(media_type, tmdb_id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה בפנייה ל-TMDb";
    return Response.json({ error: message }, { status: 502 });
  }
  const { name, releaseDate, posterPath, overview, cast, directors } = normalized;

  let titleId: number;
  try {
    const insertResult = await db.execute({
      sql: `INSERT INTO titles (tmdb_id, media_type, name, poster_path, release_date, overview, rating, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tmdb_id,
        media_type,
        name,
        posterPath ?? null,
        releaseDate ?? null,
        overview ?? null,
        rating ?? null,
        notes ?? null,
      ],
    });
    titleId = Number(insertResult.lastInsertRowid);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE")) {
      return Response.json({ error: "הכותר הזה כבר נמצא ברשימה" }, { status: 409 });
    }
    throw err;
  }

  if (watchedValue) {
    await db.execute({
      sql: `INSERT INTO watch_events (title_id, year, month, day, precision) VALUES (?, ?, ?, ?, ?)`,
      args: [titleId, watchedValue.year, watchedValue.month ?? null, watchedValue.day ?? null, watchedValue.precision],
    });
  }

  const castList = (cast ?? []).slice(0, 24);
  const creditRows = [
    ...castList.map((c, idx) => ({
      sql: `INSERT INTO credits (title_id, person_tmdb_id, name, role, job, character_name, profile_path, sort_order)
            VALUES (?, ?, ?, 'cast', NULL, ?, ?, ?)`,
      args: [titleId, c.id, c.name, c.character ?? null, c.profile_path ?? null, c.order ?? idx],
    })),
    ...directors.map((d, idx) => ({
      sql: `INSERT INTO credits (title_id, person_tmdb_id, name, role, job, character_name, profile_path, sort_order)
            VALUES (?, ?, ?, 'crew', ?, NULL, ?, ?)`,
      args: [titleId, d.id, d.name, d.job, d.profile_path ?? null, idx],
    })),
  ];
  if (creditRows.length > 0) {
    await db.batch(creditRows, "write");
  }

  return Response.json({ id: titleId }, { status: 201 });
}
