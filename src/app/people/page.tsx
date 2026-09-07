import Link from "next/link";
import { db, ensureSchema } from "@/lib/db";
import { tmdbImageUrl, getPersonDetails } from "@/lib/tmdb";
import PersonFavoriteToggle from "@/components/PersonFavoriteToggle";

export const dynamic = "force-dynamic";

type PersonRow = {
  personId: number;
  name: string;
  profilePath: string | null;
  titleCount: number;
  favorite: boolean;
};

// עמוד אנשים: כל שחקן/ית ובמאי/ית ייחודיים מתוך כל הכותרים שכבר ברשימה,
// כדי לאפשר שליפה "לפי שחקנים / במאים" (בקשה של המשתמש). מקבצים לפי
// person_tmdb_id כי אותו אדם יכול להופיע בכמה שורות credits (כותרים שונים).
// בנוסף, מי שנוסף/ה ישירות דרך "הוספת שחקן" (favorite_people) בלי אף כותר
// מקושר עדיין - מוצג/ת גם כן, עם השם והתמונה נשאבים ישירות מ-TMDb.
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ favorite?: string }>;
}) {
  const { favorite: favoriteParam } = await searchParams;
  const onlyFavorites = favoriteParam === "1";

  await ensureSchema();
  const [creditsResult, favoritesResult] = await Promise.all([
    db.execute(
      `SELECT person_tmdb_id, name, profile_path, title_id FROM credits ORDER BY name COLLATE NOCASE ASC`,
    ),
    db.execute("SELECT person_tmdb_id FROM favorite_people"),
  ]);

  const favoriteIds: Set<number> = new Set(
    favoritesResult.rows.map((r) => r["person_tmdb_id"] as number),
  );

  const byPerson = new Map<number, PersonRow>();
  for (const row of creditsResult.rows) {
    const personId = row["person_tmdb_id"] as number;
    const name = row["name"] as string;
    const profilePath = row["profile_path"] as string | null;
    const titleId = row["title_id"] as number;
    const existing = byPerson.get(personId);
    if (existing) {
      existing.titleCount += 1;
      if (!existing.profilePath && profilePath) existing.profilePath = profilePath;
    } else {
      byPerson.set(personId, {
        personId,
        name,
        profilePath,
        titleCount: 1,
        favorite: favoriteIds.has(personId),
      });
    }
    void titleId;
  }

  // מי שסומן/ה כאהוב/ה (למשל דרך "הוספת שחקן") אבל עדיין אין לו/לה אף
  // כותר מקושר - שולפים שם ותמונה ישירות מ-TMDb כדי שגם הם/ן יופיעו כאן.
  const missingFavoriteIds = [...favoriteIds].filter((id) => !byPerson.has(id));
  if (missingFavoriteIds.length > 0) {
    const fetched = await Promise.all(
      missingFavoriteIds.map(async (personId) => {
        try {
          const details = await getPersonDetails(personId);
          return { personId, name: details.name, profilePath: details.profile_path };
        } catch {
          return null; // מזהה לא תקין/בעיית רשת - פשוט מדלגים
        }
      }),
    );
    for (const f of fetched) {
      if (!f) continue;
      byPerson.set(f.personId, {
        personId: f.personId,
        name: f.name,
        profilePath: f.profilePath,
        titleCount: 0,
        favorite: true,
      });
    }
  }

  const allPeople = [...byPerson.values()].sort((a, b) => a.name.localeCompare(b.name, "he"));
  const people = onlyFavorites ? allPeople.filter((p) => p.favorite) : allPeople;

  if (allPeople.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-20">
        <p className="mb-4">עדיין אין שחקנים או במאים ברשימה.</p>
        <Link href="/people/add" className="underline">
          + הוספת שחקן/ית או במאי/ית
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-semibold">שחקנים ובמאים</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={onlyFavorites ? "/people" : "/people?favorite=1"}
            className={onlyFavorites ? "text-red-400 font-medium" : "text-neutral-400"}
          >
            {onlyFavorites ? "♥ מציג רק אהובים - הצגת הכל" : "♥ רק אהובים עליי"}
          </Link>
          <Link href="/people/add" className="underline text-neutral-300">
            + הוספת שחקן/ית
          </Link>
        </div>
      </div>
      {people.length === 0 ? (
        <p className="text-neutral-400 py-10 text-center">אין עדיין שחקנים/במאים שסימנת כאהובים.</p>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {people.map((p) => {
          const photo = tmdbImageUrl(p.profilePath, "w185");
          return (
            <div key={p.personId} className="relative text-center">
              <PersonFavoriteToggle
                personId={p.personId}
                initialFavorite={p.favorite}
                className="absolute top-1 right-1 z-10 text-sm drop-shadow"
              />
              <Link href={`/person/${p.personId}`} className="group block">
                <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:opacity-80 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs p-1 text-center">
                      {p.name}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {p.titleCount > 0
                    ? `${p.titleCount} ${p.titleCount === 1 ? "כותר" : "כותרים"}`
                    : "עוד לא נצפה כותר"}
                </p>
              </Link>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
