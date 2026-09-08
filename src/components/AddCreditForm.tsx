"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { TmdbPersonSearchResult } from "@/lib/tmdb";

type Role = "cast" | "crew";

// מוסיף ידנית שחקן/ית או במאי/ית לכותר, גם אם הוא/היא לא מופיע/ה
// ברשימת הקאסט שמגיעה מ-TMDb (בעיה נפוצה בסדרות עם כמה עונות - TMDb
// בד"כ מחזיר רק את הקאסט של העונה האחרונה). שני שלבים: חיפוש ובחירת
// אדם, ואז בחירת תפקיד (ואופציונלית שם דמות, אם זה/ו שחקן/ית).
export default function AddCreditForm({ titleId }: { titleId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbPersonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TmdbPersonSearchResult | null>(null);
  const [role, setRole] = useState<Role>("cast");
  const [characterName, setCharacterName] = useState("");
  const [job, setJob] = useState("Director");
  const [saving, setSaving] = useState(false);

  function reset() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected(null);
    setRole("cast");
    setCharacterName("");
    setJob("Director");
    setError(null);
  }

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

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/titles/${titleId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: selected.id,
          name: selected.name,
          profilePath: selected.profile_path,
          role,
          characterName: role === "cast" ? characterName : null,
          job: role === "crew" ? job : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "שגיאה בהוספה");
      }
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספה");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-sm underline text-neutral-400 hover:text-neutral-100"
      >
        + הוספת שחקן/ית או במאי/ית שלא מופיע/ה כאן
      </button>
    );
  }

  return (
    <div className="mt-2 mb-6 max-w-md rounded-lg border border-neutral-800 p-4 space-y-3">
      <p className="text-xs text-neutral-400">
        שימושי כשל-TMDb יש רק את הקאסט של העונה האחרונה, ורוצים לקשר גם
        שחקן/ית מעונה מוקדמת יותר.
      </p>

      {!selected ? (
        <>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפשו לפי שם..."
              autoFocus
              className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-neutral-100 text-neutral-900 px-3 py-1 text-sm font-medium disabled:opacity-60"
            >
              {loading ? "מחפש..." : "חיפוש"}
            </button>
          </form>

          {results.length > 0 && (
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {results.map((p) => {
                const photo = p.profile_path ? `https://image.tmdb.org/t/p/w92${p.profile_path}` : null;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelected(p)}
                      className="w-full flex gap-2 items-center p-1.5 rounded-md hover:bg-neutral-900 text-right"
                    >
                      <div className="w-8 shrink-0 rounded bg-neutral-800 overflow-hidden aspect-[2/3]">
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{p.name}</p>
                        {p.known_for_department && (
                          <p className="text-xs text-neutral-500 truncate">{p.known_for_department}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            נבחר/ה: <span className="font-medium">{selected.name}</span>
          </p>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={role === "cast"}
                onChange={() => setRole("cast")}
              />
              שחקן/ית
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={role === "crew"}
                onChange={() => setRole("crew")}
              />
              במאי/ית או יוצר/ת
            </label>
          </div>

          {role === "cast" ? (
            <label className="block">
              <span className="text-xs text-neutral-400">שם הדמות (לא חובה)</span>
              <input
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="mt-1 block w-full rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1 text-sm"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-xs text-neutral-400">תפקיד</span>
              <select
                value={job}
                onChange={(e) => setJob(e.target.value)}
                className="mt-1 block w-full rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1 text-sm"
              >
                <option value="Director">במאי/ית</option>
                <option value="Creator">יוצר/ת</option>
              </select>
            </label>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-neutral-100 text-neutral-900 px-3 py-1 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "שומר..." : "הוספה לכותר"}
            </button>
            <button onClick={() => setSelected(null)} className="text-sm text-neutral-400 underline">
              חזרה לחיפוש
            </button>
          </div>
        </div>
      )}

      {error && !selected && <p className="text-red-400 text-xs">{error}</p>}

      <button onClick={reset} className="text-xs text-neutral-500 underline block">
        ביטול
      </button>
    </div>
  );
}
