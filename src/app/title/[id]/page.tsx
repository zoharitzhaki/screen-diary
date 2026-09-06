import { notFound } from "next/navigation";
import { db, ensureSchema } from "@/lib/db";
import { tmdbImageUrl } from "@/lib/tmdb";
import { compareWatchedDesc, formatWatchedDate, type WatchedPrecision } from "@/lib/dates";
import TmdbAttribution from "@/components/TmdbAttribution";
import DeleteButton from "@/components/DeleteButton";
import PersonCard from "@/components/PersonCard";
import EditRatingNotes from "@/components/EditRatingNotes";
import AddWatchForm from "@/components/AddWatchForm";
import DeleteWatchButton from "@/components/DeleteWatchButton";
import FavoriteToggle from "@/components/FavoriteToggle";

export const dynamic = "force-dynamic";

type CreditRow = {
  id: number;
  person_tmdb_id: number;
  name: string;
  role: "cast" | "crew";
  job: string | null;
  character_name: string | null;
  profile_path: string | null;
};

type WatchRow = {
  id: number;
  year: number;
  month: number | null;
  day: number | null;
  precision: WatchedPrecision;
};

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureSchema();

  const titleResult = await db.execute({ sql: "SELECT * FROM titles WHERE id = ?", args: [id] });
  const row = titleResult.rows[0];
  if (!row) {
    notFound();
  }

  const title = {
    id: row["id"] as number,
    name: row["name"] as string,
    media_type: row["media_type"] as string,
    poster_path: row["poster_path"] as string | null,
    release_date: row["release_date"] as string | null,
    overview: row["overview"] as string | null,
    rating: row["rating"] as number | null,
    notes: row["notes"] as string | null,
    favorite: Boolean(row["favorite"]),
  };

  const watchesResult = await db.execute({
    sql: "SELECT * FROM watch_events WHERE title_id = ?",
    args: [id],
  });
  const watches: WatchRow[] = watchesResult.rows
    .map((r) => ({
      id: r["id"] as number,
      year: r["year"] as number,
      month: r["month"] as number | null,
      day: r["day"] as number | null,
      precision: r["precision"] as WatchedPrecision,
    }))
    .sort(compareWatchedDesc);

  const creditsResult = await db.execute({
    sql: "SELECT * FROM credits WHERE title_id = ? ORDER BY sort_order ASC",
    args: [id],
  });
  const credits: CreditRow[] = creditsResult.rows.map((r) => ({
    id: r["id"] as number,
    person_tmdb_id: r["person_tmdb_id"] as number,
    name: r["name"] as string,
    role: r["role"] as "cast" | "crew",
    job: r["job"] as string | null,
    character_name: r["character_name"] as string | null,
    profile_path: r["profile_path"] as string | null,
  }));
  const cast = credits.filter((c) => c.role === "cast");
  const directors = credits.filter((c) => c.role === "crew");

  // אילו מהאנשים שמופיעים כאן כבר מסומנים כאהובים, כדי להעביר את זה
  // ל-PersonCard (הלב מתחיל מסומן אם כן).
  const personIds = credits.map((c) => c.person_tmdb_id);
  let favoritePersonIds = new Set<number>();
  if (personIds.length > 0) {
    const placeholders = personIds.map(() => "?").join(",");
    const favResult = await db.execute({
      sql: `SELECT person_tmdb_id FROM favorite_people WHERE person_tmdb_id IN (${placeholders})`,
      args: personIds,
    });
    favoritePersonIds = new Set(favResult.rows.map((r) => r["person_tmdb_id"] as number));
  }

  const poster = tmdbImageUrl(title.poster_path, "w500");

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <div className="w-48 shrink-0 rounded-lg overflow-hidden bg-neutral-900 aspect-[2/3]">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt={title.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
            {title.name}
            <FavoriteToggle titleId={title.id} initialFavorite={title.favorite} className="text-xl" />
          </h1>
          <p className="text-sm text-neutral-400 mb-1">
            <span role="img" aria-hidden="true">
              {title.media_type === "movie" ? "🎬" : "📺"}
            </span>{" "}
            {title.media_type === "movie" ? "סרט" : "סדרה"}
            {title.release_date ? ` · שודר/יצא לראשונה: ${title.release_date}` : ""}
          </p>
          <div className="text-sm text-neutral-400 mb-4">
            <p className="mb-1">תאריכי צפייה:</p>
            {watches.length === 0 ? (
              <p>לא צוין תאריך צפייה</p>
            ) : (
              <ul className="space-y-1">
                {watches.map((w) => (
                  <li key={w.id} className="flex items-center gap-2">
                    <span>{formatWatchedDate(w)}</span>
                    <DeleteWatchButton titleId={title.id} watchId={w.id} />
                  </li>
                ))}
              </ul>
            )}
            <AddWatchForm titleId={title.id} />
            {title.rating ? <p className="mt-2">דירוג אישי: {title.rating}/10</p> : null}
          </div>
          {title.overview && <p className="text-sm leading-relaxed max-w-xl">{title.overview}</p>}
          {title.notes && <p className="text-sm text-neutral-400 mt-3">הערות: {title.notes}</p>}
          <EditRatingNotes titleId={title.id} initialRating={title.rating} initialNotes={title.notes} />
          <div className="mt-3">
            <DeleteButton id={title.id} />
          </div>
        </div>
      </div>

      {directors.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">
            {directors[0].job === "Creator" ? "יוצרים" : "במאים"}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-10">
            {directors.map((d) => (
              <PersonCard
                key={d.id}
                personId={d.person_tmdb_id}
                name={d.name}
                profilePath={d.profile_path}
                subtitle={d.job === "Creator" ? "יוצר/ת" : "במאי/ית"}
                favorite={favoritePersonIds.has(d.person_tmdb_id)}
              />
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold mb-4">שחקנים</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {cast.map((c) => (
          <PersonCard
            key={c.id}
            personId={c.person_tmdb_id}
            name={c.name}
            profilePath={c.profile_path}
            subtitle={c.character_name ? `בתפקיד ${c.character_name}` : null}
            favorite={favoritePersonIds.has(c.person_tmdb_id)}
          />
        ))}
      </div>

      <TmdbAttribution />
    </div>
  );
}
