import Link from "next/link";
import { notFound } from "next/navigation";
import { db, ensureSchema } from "@/lib/db";
import { tmdbImageUrl, getPersonCombinedCredits, getPersonDetails } from "@/lib/tmdb";
import { compareWatchedDesc, formatWatchedDate, releaseYear, type WatchedPrecision } from "@/lib/dates";
import TmdbAttribution from "@/components/TmdbAttribution";
import QuickAddButton from "@/components/QuickAddButton";
import FavoriteToggle from "@/components/FavoriteToggle";
import PersonFavoriteToggle from "@/components/PersonFavoriteToggle";
import AddTitleToPersonForm from "@/components/AddTitleToPersonForm";

export const dynamic = "force-dynamic";

function mediaTypeLabel(mediaType: string) {
  return mediaType === "movie" ? "סרט" : "סדרה";
}

// אייקון קטן במקום טקסט על גבי הפוסטר: מצלמת קולנוע לסרט, מסך טלוויזיה
// לסדרה. שומרים גם aria-label/title עם הטקסט המלא לצורך נגישות.
function mediaTypeIcon(mediaType: string) {
  return mediaType === "movie" ? "🎬" : "📺";
}

type Appearance = {
  titleId: number;
  titleName: string;
  mediaType: string;
  posterPath: string | null;
  releaseDate: string | null;
  roleLabel: string;
  favorite: boolean;
};

type WatchEventRow = {
  title_id: number;
  year: number;
  month: number | null;
  day: number | null;
  precision: WatchedPrecision;
};

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureSchema();

  // מצטרפים ל-titles כדי לקבל בבת אחת גם את פרטי האדם וגם את כל הכותרים
  // שבהם הוא מופיע (כשחקן או כצוות) מתוך מה שכבר סימנת כנצפה. מכנים כל
  // עמודה במפורש (AS) כי גם ל-credits וגם ל-titles יש עמודת "name", ובלי
  // כינוי היו מתנגשות בתוצאה. תאריך הצפייה עצמו נמצא בטבלה נפרדת
  // (watch_events), אז לא שואבים אותו כאן.
  const [creditsResult, titlesResult] = await Promise.all([
    db.execute({
      sql: `SELECT
              c.person_tmdb_id AS person_id,
              c.name AS person_name,
              c.profile_path AS person_profile_path,
              c.role AS role,
              c.job AS job,
              c.character_name AS character_name,
              t.id AS title_id,
              t.name AS title_name,
              t.media_type AS media_type,
              t.tmdb_id AS tmdb_id,
              t.poster_path AS title_poster_path,
              t.release_date AS release_date,
              t.favorite AS favorite
            FROM credits c
            JOIN titles t ON t.id = c.title_id
            WHERE c.person_tmdb_id = ?`,
      args: [id],
    }),
    db.execute("SELECT id, tmdb_id, media_type FROM titles"),
  ]);

  const personFavoriteResult = await db.execute({
    sql: "SELECT 1 FROM favorite_people WHERE person_tmdb_id = ?",
    args: [id],
  });
  const isPersonFavorite = personFavoriteResult.rows.length > 0;

  // אם אין עדיין אף כותר מקושר לאדם הזה אצלכם (למשל הוא נוסף דרך "הוספת
  // שחקן" בלי לצפות עדיין באף אחד מהכותרים שלו) - שואבים שם ותמונה ישירות
  // מ-TMDb במקום מ-credits. רק אם גם TMDb לא מכיר את המזהה הזה, זה 404 אמיתי.
  let personName: string;
  let personProfilePath: string | null;
  if (creditsResult.rows.length === 0) {
    try {
      const details = await getPersonDetails(Number(id));
      personName = details.name;
      personProfilePath = details.profile_path;
    } catch {
      notFound();
    }
  } else {
    personName = creditsResult.rows[0]["person_name"] as string;
    personProfilePath = creditsResult.rows[0]["person_profile_path"] as string | null;
  }

  // סט של כל (tmdb_id, media_type) שכבר ברשימה שלי, כדי לדעת אילו כותרים
  // מתוך הפילמוגרפיה המלאה של האדם (מ-TMDb) כבר נצפו ואילו אפשר להוסיף.
  const watchedKeys = new Set(
    titlesResult.rows.map((r) => `${r["tmdb_id"]}:${r["media_type"]}`),
  );

  // מקבצים לפי כותר, כי אותו אדם יכול להופיע גם כשחקן וגם כצוות באותו כותר
  const byTitle = new Map<number, Appearance>();
  for (const row of creditsResult.rows) {
    const titleId = row["title_id"] as number;
    const role = row["role"] as "cast" | "crew";
    const job = row["job"] as string | null;
    const characterName = row["character_name"] as string | null;
    const roleLabel =
      role === "cast"
        ? characterName
          ? `בתפקיד ${characterName}`
          : "שחקן/ית"
        : job === "Creator"
          ? "יוצר/ת"
          : "במאי/ית";

    const existing = byTitle.get(titleId);
    if (existing) {
      existing.roleLabel = `${existing.roleLabel} · ${roleLabel}`;
    } else {
      byTitle.set(titleId, {
        titleId,
        titleName: row["title_name"] as string,
        mediaType: row["media_type"] as string,
        posterPath: row["title_poster_path"] as string | null,
        releaseDate: row["release_date"] as string | null,
        roleLabel,
        favorite: Boolean(row["favorite"]),
      });
    }
  }
  const appearances = [...byTitle.values()];

  // תאריך צפייה אחרון לכל אחד מהכותרים שצפיתי בהם עם האדם הזה, להצגה מתחת
  // לפוסטר (כמו בעמוד הבית).
  const titleIds = appearances.map((a) => a.titleId);
  let latestWatchByTitle = new Map<number, WatchEventRow>();
  if (titleIds.length > 0) {
    const placeholders = titleIds.map(() => "?").join(",");
    const watchesResult = await db.execute({
      sql: `SELECT * FROM watch_events WHERE title_id IN (${placeholders})`,
      args: titleIds,
    });
    for (const r of watchesResult.rows) {
      const event: WatchEventRow = {
        title_id: r["title_id"] as number,
        year: r["year"] as number,
        month: r["month"] as number | null,
        day: r["day"] as number | null,
        precision: r["precision"] as WatchedPrecision,
      };
      const existing = latestWatchByTitle.get(event.title_id);
      if (!existing || compareWatchedDesc(event, existing) < 0) {
        latestWatchByTitle.set(event.title_id, event);
      }
    }
  }

  // הפילמוגרפיה המלאה של האדם לפי TMDb (לא רק מה שצפיתם בו), כדי להציג
  // רשימה נוספת עם אפשרות הוספה מהירה לכותרים שעדיין לא ברשימה.
  let fullFilmography: Awaited<ReturnType<typeof getPersonCombinedCredits>> = [];
  try {
    fullFilmography = await getPersonCombinedCredits(Number(id));
  } catch {
    // אם הקריאה ל-TMDb נכשלת (למשל בעיית רשת זמנית), פשוט לא מציגים את
    // הרשימה הנוספת - עמוד האדם עדיין עובד עם מה שכבר יש במסד הנתונים.
    fullFilmography = [];
  }
  const notYetWatched = fullFilmography
    .filter((f) => !watchedKeys.has(`${f.id}:${f.mediaType}`))
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));

  const photo = tmdbImageUrl(personProfilePath, "w342");

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-24 shrink-0 rounded-lg overflow-hidden bg-neutral-900 aspect-[2/3]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={personName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs p-1 text-center">
              {personName}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {personName}
            <PersonFavoriteToggle personId={Number(id)} initialFavorite={isPersonFavorite} className="text-xl" />
          </h1>
          <p className="text-sm text-neutral-400">
            {appearances.length} {appearances.length === 1 ? "כותר שצפית בו" : "כותרים שצפית בהם"}
          </p>
        </div>
      </div>

      <AddTitleToPersonForm
        personId={Number(id)}
        personName={personName}
        personProfilePath={personProfilePath}
      />

      <h2 className="text-lg font-semibold mb-4">כותרים שצפית בהם</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
        {appearances.map((a) => {
          const poster = tmdbImageUrl(a.posterPath, "w342");
          const watch = latestWatchByTitle.get(a.titleId);
          return (
            <div key={a.titleId} className="relative">
              <FavoriteToggle
                titleId={a.titleId}
                initialFavorite={a.favorite}
                className="absolute top-2 right-2 z-10 text-xl drop-shadow"
              />
              <Link href={`/title/${a.titleId}`} className="group block">
                <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900 relative">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster}
                      alt={a.titleName}
                      className="w-full h-full object-cover group-hover:opacity-80 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm p-2 text-center">
                      {a.titleName}
                    </div>
                  )}
                  <span
                    className="absolute bottom-1 left-1 text-sm px-1 py-0.5 rounded bg-black/70 leading-none"
                    role="img"
                    aria-label={mediaTypeLabel(a.mediaType)}
                    title={mediaTypeLabel(a.mediaType)}
                  >
                    {mediaTypeIcon(a.mediaType)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium truncate">
                  {a.titleName}
                  {releaseYear(a.releaseDate) && (
                    <span className="text-neutral-500 font-normal"> ({releaseYear(a.releaseDate)})</span>
                  )}
                </p>
                <p className="text-xs text-neutral-500 truncate">{a.roleLabel}</p>
                <p className="text-xs text-neutral-600 truncate">
                  {watch ? formatWatchedDate(watch) : "לא צוין תאריך צפייה"}
                </p>
              </Link>
            </div>
          );
        })}
      </div>

      {notYetWatched.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">עוד כותרים של {personName} (לפי TMDb)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {notYetWatched.map((f) => {
              const poster = tmdbImageUrl(f.posterPath, "w342");
              return (
                <div key={`${f.mediaType}-${f.id}`}>
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900 relative">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster} alt={f.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm p-2 text-center">
                        {f.name}
                      </div>
                    )}
                    <span
                      className="absolute bottom-1 left-1 text-sm px-1 py-0.5 rounded bg-black/70 leading-none"
                      role="img"
                      aria-label={mediaTypeLabel(f.mediaType)}
                      title={mediaTypeLabel(f.mediaType)}
                    >
                      {mediaTypeIcon(f.mediaType)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium truncate">
                    {f.name}
                    {releaseYear(f.releaseDate) && (
                      <span className="text-neutral-500 font-normal"> ({releaseYear(f.releaseDate)})</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">{f.roleLabel}</p>
                  <QuickAddButton tmdbId={f.id} mediaType={f.mediaType} />
                </div>
              );
            })}
          </div>
        </>
      )}

      <TmdbAttribution />
    </div>
  );
}
