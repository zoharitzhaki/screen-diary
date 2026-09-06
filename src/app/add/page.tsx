"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { TmdbSearchResult } from "@/lib/tmdb";
import WatchedDatePicker, { type WatchedValue } from "@/components/WatchedDatePicker";

export default function AddPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null);
  const [watched, setWatched] = useState<WatchedValue>(null);

  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בחיפוש");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdb_id: selected.id,
          media_type: selected.media_type,
          watched,
          rating: rating ? Number(rating) : null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בהוספה");
      router.push(`/title/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספה");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">הוספת סרט או סדרה</h1>

      {!selected && (
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
      )}

      {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

      {!selected && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => {
            const label = r.title ?? r.name ?? "";
            const year = (r.release_date ?? r.first_air_date ?? "").slice(0, 4);
            return (
              <li key={`${r.media_type}-${r.id}`}>
                <button
                  onClick={() => setSelected(r)}
                  className="w-full flex gap-3 text-start p-2 rounded-md hover:bg-neutral-900"
                >
                  <div className="w-12 shrink-0 rounded bg-neutral-800 overflow-hidden aspect-[2/3]">
                    {r.poster_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://image.tmdb.org/t/p/w92${r.poster_path}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-neutral-500">
                      {r.media_type === "movie" ? "סרט" : "סדרה"}
                      {year ? ` · ${year}` : ""}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!selected && results.length === 0 && !loading && query && (
        <p className="text-neutral-500 text-sm">אין תוצאות עדיין - נסו לחפש.</p>
      )}

      {selected && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="w-16 shrink-0 rounded bg-neutral-800 overflow-hidden aspect-[2/3]">
              {selected.poster_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://image.tmdb.org/t/p/w154${selected.poster_path}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <p className="font-medium">{selected.title ?? selected.name}</p>
              <button onClick={() => setSelected(null)} className="text-xs text-neutral-500 underline">
                בחירה אחרת
              </button>
            </div>
          </div>

          <div>
            <span className="text-sm text-neutral-400 block mb-2">מתי צפיתם? (בוחרים כמה מדויק)</span>
            <WatchedDatePicker onChange={setWatched} allowNone />
          </div>

          <label className="block">
            <span className="text-sm text-neutral-400">דירוג אישי, 1-10 (לא חובה)</span>
            <input
              type="number"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="mt-1 block w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-neutral-400">הערות (לא חובה)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
            />
          </label>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-neutral-100 text-neutral-900 px-4 py-2 font-medium disabled:opacity-60"
          >
            {submitting ? "שומר..." : "שמירה"}
          </button>
        </div>
      )}
    </div>
  );
}
