import Link from "next/link";
import { db, ensureSchema } from "@/lib/db";
import { tmdbImageUrl } from "@/lib/tmdb";
import { compareWatchedDesc, formatWatchedDate, releaseYear, type WatchedPrecision } from "@/lib/dates";
import TmdbAttribution from "@/components/TmdbAttribution";
import FavoriteToggle from "@/components/FavoriteToggle";

export const dynamic = "force-dynamic";

type TitleRow = {
  id: number;
  name: string;
  media_type: "movie" | "tv";
  poster_path: string | null;
  release_date: string | null;
  favorite: boolean;
};

type WatchEventRow = {
  title_id: number;
  year: number;
  month: number | null;
  day: number | null;
  precision: WatchedPrecision;
};

type SortMode = "watched" | "release";
type SortDir = "asc" | "desc";

function mediaTypeLabel(mediaType: "movie" | "tv") {
  return mediaType === "movie" ? "סרט" : "סדרה";
}

// אייקון קטן במקום טקסט על גבי הפוסטר: מצלמת קולנוע לסרט, מסך טלוויזיה
// לסדרה. שומרים גם aria-label/title עם הטקסט המלא לצורך נגישות.
function mediaTypeIcon(mediaType: "movie" | "tv") {
  return mediaType === "movie" ? "🎬" : "📺";
}

// בונה קישור לעמוד הבית עם אותם פילטרים/מיון הנוכחיים, פרט לאלה שמופיעים
// ב-overrides - כך שכל בקר (מיון / כיוון / מועדפים) עצמאי ולא מאפס את האחרים.
function homeHref(
  current: { sort: SortMode; dir: SortDir; onlyFavorites: boolean },
  overrides: Partial<{ sort: SortMode; dir: SortDir; onlyFavorites: boolean }>,
) {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  params.set("sort", merged.sort);
  params.set("dir", merged.dir);
  if (merged.onlyFavorites) params.set("favorite", "1");
  return `/?${params.toString()}`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; favorite?: string }>;
}) {
  const { sort, dir, favorite } = await searchParams;
  const sortMode: SortMode = sort === "release" ? "release" : "watched";
  const sortDir: SortDir = dir === "asc" ? "asc" : "desc";
  const onlyFavorites = favorite === "1";

  await ensureSchema();
  const [titlesResult, watchesResult] = await Promise.all([
    db.execute("SELECT * FROM titles ORDER BY id DESC"),
    db.execute("SELECT * FROM watch_events"),
  ]);

  const allTitles: TitleRow[] = titlesResult.rows.map((r) => ({
    id: r["id"] as number,
    name: r["name"] as string,
    media_type: r["media_type"] as "movie" | "tv",
    poster_path: r["poster_path"] as string | null,
    release_date: r["release_date"] as string | null,
    favorite: Boolean(r["favorite"]),
  }));
  const titles = onlyFavorites ? allTitles.filter((t) => t.favorite) : allTitles;

  // הצפייה האחרונה לכל כותר (יכולות להיות כמה, למשל צפייה חוזרת). כותר
  // בלי אף רשומת צפייה מקבל null ונדחק לסוף במיון "תאריך צפייה", בלי קשר
  // לכיוון המיון.
  const latestWatchByTitle = new Map<number, WatchEventRow>();
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

  const directionSign = sortDir === "asc" ? -1 : 1;
  const sorted = [...titles].sort((a, b) => {
    if (sortMode === "release") {
      return directionSign * (b.release_date ?? "").localeCompare(a.release_date ?? "");
    }
    const wa = latestWatchByTitle.get(a.id);
    const wb = latestWatchByTitle.get(b.id);
    if (!wa && !wb) return 0;
    if (!wa) return 1; // בלי תאריך צפייה - תמיד לסוף, בכל כיוון
    if (!wb) return -1;
    return directionSign * compareWatchedDesc(wa, wb);
  });

  if (allTitles.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-20">
        <p className="mb-4">עדיין לא הוספת שום דבר לרשימה.</p>
        <Link href="/add" className="underline">
          להוסיף את הסרט או הסדרה הראשונים
        </Link>
      </div>
    );
  }

  const controlsState = { sort: sortMode, dir: sortDir, onlyFavorites };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm">
        <span className="text-neutral-500">מיון:</span>
        <Link
          href={homeHref(controlsState, { sort: "watched" })}
          className={sortMode === "watched" ? "underline font-medium" : "text-neutral-400"}
        >
          תאריך צפייה
        </Link>
        <Link
          href={homeHref(controlsState, { sort: "release" })}
          className={sortMode === "release" ? "underline font-medium" : "text-neutral-400"}
        >
          תאריך יציאה
        </Link>

        <span className="text-neutral-700">|</span>
        <Link
          href={homeHref(controlsState, { dir: sortDir === "asc" ? "desc" : "asc" })}
          className="text-neutral-400 underline"
          title="היפוך כיוון המיון"
        >
          {sortDir === "asc" ? "מהישן לחדש ↑" : "מהחדש לישן ↓"}
        </Link>

        <span className="text-neutral-700">|</span>
        <Link
          href={homeHref(controlsState, { onlyFavorites: !onlyFavorites })}
          className={onlyFavorites ? "text-yellow-400 font-medium" : "text-neutral-400"}
        >
          {onlyFavorites ? "★ מציג רק מועדפים - הצגת הכל" : "★ רק מועדפים"}
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="text-neutral-400 py-10 text-center">אין כותרים שמסומנים כמועדפים עדיין.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sorted.map((t) => {
            const poster = tmdbImageUrl(t.poster_path, "w342");
            const watch = latestWatchByTitle.get(t.id);
            return (
              <div key={t.id} className="relative">
                <FavoriteToggle
                  titleId={t.id}
                  initialFavorite={t.favorite}
                  className="absolute top-2 right-2 z-10 text-xl drop-shadow"
                />
                <Link href={`/title/${t.id}`} className="group block">
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900 relative">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={poster}
                        alt={t.name}
                        className="w-full h-full object-cover group-hover:opacity-80 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm p-2 text-center">
                        {t.name}
                      </div>
                    )}
                    <span
                      className="absolute bottom-1 left-1 text-sm px-1 py-0.5 rounded bg-black/70 leading-none"
                      role="img"
                      aria-label={mediaTypeLabel(t.media_type)}
                      title={mediaTypeLabel(t.media_type)}
                    >
                      {mediaTypeIcon(t.media_type)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium truncate">
                    {t.name}
                    {releaseYear(t.release_date) && (
                      <span className="text-neutral-500 font-normal"> ({releaseYear(t.release_date)})</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {sortMode === "watched"
                      ? watch
                        ? `נצפה: ${formatWatchedDate(watch)}`
                        : "לא צוין תאריך צפייה"
                      : `יצא: ${t.release_date ?? "לא ידוע"}`}
                  </p>
                </Link>
              </div>
            );
          })}
        </div>
      )}
      <TmdbAttribution />
    </>
  );
}
