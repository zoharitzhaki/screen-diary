"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import WatchedDatePicker, { type WatchedValue } from "@/components/WatchedDatePicker";

export default function QuickAddButton({
  tmdbId,
  mediaType,
}: {
  tmdbId: number;
  mediaType: "movie" | "tv";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<WatchedValue>(null);
  const [rating, setRating] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdb_id: tmdbId,
          media_type: mediaType,
          watched: value,
          rating: rating ? Number(rating) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "שגיאה בהוספה");
      }
      setOpen(false);
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
        className="mt-2 text-xs rounded-md bg-neutral-100 text-neutral-900 px-2 py-1 font-medium"
      >
        + הוספה לרשימה שלי
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 text-right">
      <WatchedDatePicker onChange={setValue} allowNone={true} />
      <label className="block">
        <span className="text-xs text-neutral-400">דירוג אישי, 1-10 (לא חובה)</span>
        <input
          type="number"
          min={1}
          max={10}
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="mt-1 block w-full rounded-md bg-neutral-900 border border-neutral-700 px-2 py-1 text-sm"
        />
      </label>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-neutral-100 text-neutral-900 px-2 py-1 text-xs font-medium disabled:opacity-60"
        >
          {saving ? "שומר..." : "הוספה"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-400 underline">
          ביטול
        </button>
      </div>
    </div>
  );
}
