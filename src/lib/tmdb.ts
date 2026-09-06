// עטיפה דקה סביב TMDb API (v3). כל הקריאות רצות בצד שרת בלבד - המפתח
// (TMDB_API_KEY) לעולם לא נחשף לדפדפן.
// תיעוד: https://developer.themoviedb.org/reference

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbSearchResult = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  overview?: string;
};

export type TmdbCastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
  order: number;
};

export type TmdbCrewMember = {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
};

export type TmdbCreator = {
  id: number;
  name: string;
  profile_path: string | null;
};

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("חסר TMDB_API_KEY בהגדרות הסביבה - ראו README כדי ליצור מפתח חינמי");
  }
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", process.env.TMDB_LANGUAGE ?? "en-US");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`שגיאת TMDb (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export function tmdbImageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export async function searchMulti(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>("/search/multi", {
    query,
    include_adult: "false",
  });
  return data.results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
}

export type TmdbPersonSearchResult = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
};

// חיפוש אדם (שחקן/ית או במאי/ית) לפי שם, כדי לאפשר "הוספת שחקן" ישירה גם
// לפני שצפיתם באיזשהו כותר שלו/שלה - ולא רק דרך קרדיטים של כותר קיים.
export async function searchPerson(query: string): Promise<TmdbPersonSearchResult[]> {
  const data = await tmdbFetch<{ results: TmdbPersonSearchResult[] }>("/search/person", {
    query,
    include_adult: "false",
  });
  return data.results;
}

export type TmdbPersonDetails = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
};

export async function getPersonDetails(personId: number): Promise<TmdbPersonDetails> {
  return tmdbFetch<TmdbPersonDetails>(`/person/${personId}`);
}

export async function getMovieDetails(id: number) {
  return tmdbFetch<{ title: string; release_date: string; poster_path: string | null; overview: string }>(
    `/movie/${id}`,
  );
}

export async function getTvDetails(id: number) {
  return tmdbFetch<{
    name: string;
    first_air_date: string;
    poster_path: string | null;
    overview: string;
    created_by: TmdbCreator[];
  }>(`/tv/${id}`);
}

export async function getMovieCredits(id: number) {
  return tmdbFetch<{ cast: TmdbCastMember[]; crew: TmdbCrewMember[] }>(`/movie/${id}/credits`);
}

export async function getTvCredits(id: number) {
  return tmdbFetch<{ cast: TmdbCastMember[]; crew: TmdbCrewMember[] }>(`/tv/${id}/credits`);
}

type RawCombinedCredit = {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  character?: string;
  job?: string;
};

export type PersonFilmographyItem = {
  id: number; // tmdb id של הסרט/סדרה
  mediaType: "movie" | "tv";
  name: string;
  releaseDate: string | null;
  posterPath: string | null;
  roleLabel: string;
};

// כל הסרטים/סדרות שבהם אדם מסוים השתתף (כשחקן/ית או כצוות), לפי TMDb -
// לא רק מה שכבר סימנתם כנצפה. /person/{id}/combined_credits מאחד את
// movie_credits ו-tv_credits, ולכן הצורה של כל איבר זהה למה שכבר אימתנו
// בנקודות הקצה האלה בנפרד: title/release_date לסרט, name/first_air_date
// לסדרה, character לשחקן, job/department לצוות.
export async function getPersonCombinedCredits(personId: number): Promise<PersonFilmographyItem[]> {
  const data = await tmdbFetch<{ cast: RawCombinedCredit[]; crew: RawCombinedCredit[] }>(
    `/person/${personId}/combined_credits`,
  );
  const normalize = (entries: RawCombinedCredit[], roleOf: (e: RawCombinedCredit) => string) =>
    entries
      .filter((e) => e.media_type === "movie" || e.media_type === "tv")
      .map((e) => ({
        id: e.id,
        mediaType: e.media_type as "movie" | "tv",
        name: e.title ?? e.name ?? "",
        releaseDate: e.release_date || e.first_air_date || null,
        posterPath: e.poster_path,
        roleLabel: roleOf(e),
      }));
  const castItems = normalize(data.cast ?? [], (e) => e.character || "שחקן/ית");
  const crewItems = normalize(data.crew ?? [], (e) => e.job || "צוות");
  return [...castItems, ...crewItems];
}
