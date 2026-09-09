"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Role = "cast" | "crew";

type LocalTitle = {
  id: number;
  name: string;
  media_type: "movie" | "tv";
  poster_path: string | null;
  release_date: string | null;
};

// ההפך מ-AddCreditForm: שם מוסיפים שחקן/ית לכותר נתון, כאן מקשרים כותר
// קיים (מהרשימה שלכם) לאדם נתון. שימושי כשל-TMDb לא הביא את הקרדיט הזה
// עבור הכותר (למשל עונה מוקדמת יותר, או הופעת אורח), אבל הכותר עצמו כבר
// ברשימה שלכם.
export default function AddTitleToPersonForm({
  personId,
  personName,
  personProfilePath,
}: {
  personId: number;
  personName: string;
  personProfilePath: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [allTitles, setAllTitles] = useState<LocalTitle[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LocalTitle | null>(null);
  const [role, setRole] = useState<Role>("cast");
  const [characterName, setCharacterName] = useState("");
  const [job, setJob] = useState("Director");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setQuery("");
    setSelected(null);
    setRole("cast");
    setCharacterName("");
    setJob("Director");
    setError(null);
  }

  async function handleOpen() {
    setOpen(true);
    if (allTitles) return;
    setLoadingTitles(true);
    setError(null);
    try {
      const res = await fetch("/api/titles");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAllTitles((data.titles ?? []) as LocalTitle[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הכותרים");
    } finally {
      setLoadingTitles(false);
    }
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    // הסינון עצמו קורה תוך כדי הקלדה (ראו filtered למטה) - השדה הזה קיים
    // רק כדי שאפשר יהיה ללחוץ Enter בלי שיקרה משהו מוזר.
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/titles/${selected.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          name: personName,
          profilePath: personProfilePath,
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

  const filtered =
    allTitles && query.trim()
      ? allTitles.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
      : (allTitles ?? []);

  if (!open) {
    return (
      <button onClick={handleOpen} className="text-sm underline text-neutral-400 hover:text-neutral-100">
        + קישור לכותר קיים שהאדם הזה לא מופיע/ה בו
      </button>
    );
  }

  return (
    <div className="mt-2 mb-6 max-w-md rounded-lg border border-neutral-800 p-4 space-y-3">
      <p className="text-xs text-neutral-400">
        שימושי כש-TMDb לא כלל/ה את {personName} ברשימת הקאסט/הצוות של כותר שכבר ברשימה
        שלכם (למשל עונה מוקדמת יותר, או הופעת אורח).
      </p>

      {!selected ? (
        <>
          <form onSubmit={handleSearchSubmit}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפשו כותר מהרשימה שלכם..."
              autoFocus
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1 text-sm"
            />
          </form>

          {loadingTitles ? (
            <p className="text-xs text-neutral-500">טוען כותרים...</p>
          ) : (
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelected(t)}
                    className="w-full flex gap-2 items-center p-1.5 rounded-md hover:bg-neutral-900 text-right"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{t.name}</p>
                      <p className="text-xs text-neutral-500 truncate">
                        {t.media_type === "movie" ? "סרט" : "סדרה"}
                        {t.release_date ? ` · ${t.release_date.slice(0, 4)}` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-neutral-500">לא נמצאו כותרים תואמים ברשימה שלכם.</p>
              )}
            </ul>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            נבחר: <span className="font-medium">{selected.name}</span>
          </p>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={role === "cast"} onChange={() => setRole("cast")} />
              שחקן/ית
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={role === "crew"} onChange={() => setRole("crew")} />
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
              {saving ? "שומר..." : "קישור לאדם הזה"}
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
