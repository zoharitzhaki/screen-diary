"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EditRatingNotes({
  titleId,
  initialRating,
  initialNotes,
}: {
  titleId: number;
  initialRating: number | null;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(initialRating ? String(initialRating) : "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/titles/${titleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: rating ? Number(rating) : null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "שגיאה בשמירה");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs text-neutral-400 underline mt-2">
        עריכת דירוג/הערות
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 max-w-sm">
      <label className="block">
        <span className="text-sm text-neutral-400">דירוג אישי, 1-10</span>
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
        <span className="text-sm text-neutral-400">הערות</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
        />
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-neutral-100 text-neutral-900 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "שומר..." : "שמירה"}
        </button>
        <button onClick={() => setEditing(false)} className="text-sm text-neutral-400 underline">
          ביטול
        </button>
      </div>
    </div>
  );
}
