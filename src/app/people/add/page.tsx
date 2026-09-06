"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { TmdbPersonSearchResult } from "@/lib/tmdb";

// "הוספת שחקן": מאפשר לחפש ולעקוב אחרי שחקן/ית או במאי/ית ב-TMDb גם לפני
// שצפיתם באף כותר שלו/שלה - להבדיל מהדרך הרגילה (הקישור נוצר אוטומטית
// כשמוסיפים כותר). ההוספה בפועל היא רק סימון "אהוב/ה" (favorite_people),
// כי אין באפליקציה טבלת "אנשים" נפרדת - עמוד האדם יודע לשאוב שם ותמונה
// ישירות מ-TMDb גם בלי אף כותר מקושר.
export default function AddPersonPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbPersonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search/person?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בחיפוש");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(personId: number) {
    setAddingId(personId);
    setError(null);
    try {
      const res = await fetch(`/api/people/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: true }),
      });
      if (!res.ok) throw new Error("שגיאה בהוספה");
      router.push(`/person/${personId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספה");
      setAddingId(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">הוספת שחקן/ית או במאי/ית</h1>
      <p className="text-sm text-neutral-400 mb-6">
        חיפוש ב-TMDb ומעקב אחרי שחקן/ית או במאי/ית עוד לפני שצפיתם באיזשהו
        כותר שלו/שלה. אפשר יהיה לראות בעמוד שלו/שלה את כל הפילמוגרפיה ולהוסיף
        משם כותרים שצפיתם.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפשו לפי שם..."
          className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-neutral-100 text-neutral-900 px-4 py-2 font-medium disabled:opacity-60"
        >
          {loading ? "מחפש..." : "חיפוש"}
        </button>
      </form>

      {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

      {results.length === 0 && !loading && query && (
        <p className="text-neutral-500 text-sm">אין תוצאות עדיין - נסו לחפש.</p>
      )}

      <ul className="space-y-2">
        {results.map((p) => {
          const photo = p.profile_path ? `https://image.tmdb.org/t/p/w92${p.profile_path}` : null;
          return (
            <li key={p.id} className="w-full flex gap-3 items-center p-2 rounded-md hover:bg-neutral-900">
              <div className="w-12 shrink-0 rounded bg-neutral-800 overflow-hidden aspect-[2/3]">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
                {p.known_for_department && (
                  <p className="text-xs text-neutral-500">{p.known_for_department}</p>
                )}
              </div>
              <button
                onClick={() => handleAdd(p.id)}
                disabled={addingId === p.id}
                className="rounded-md bg-neutral-100 text-neutral-900 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
              >
                {addingId === p.id ? "מוסיף..." : "+ הוספה"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
