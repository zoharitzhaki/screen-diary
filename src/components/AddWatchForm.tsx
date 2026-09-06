"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import WatchedDatePicker, { type WatchedValue } from "@/components/WatchedDatePicker";

export default function AddWatchForm({ titleId }: { titleId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<WatchedValue>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/titles/${titleId}/watches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
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
      <button onClick={() => setOpen(true)} className="text-xs text-neutral-400 underline">
        + הוספת תאריך צפייה נוסף (צפייה חוזרת)
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-3 max-w-sm">
      <WatchedDatePicker onChange={setValue} allowNone={false} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !value}
          className="rounded-md bg-neutral-100 text-neutral-900 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "שומר..." : "הוספה"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-neutral-400 underline">
          ביטול
        </button>
      </div>
    </div>
  );
}
