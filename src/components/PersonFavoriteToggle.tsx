"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";

// לב "שחקן/ית או במאי/ית אהוב/ה עליי", במקביל לכוכבית של כותרים
// (FavoriteToggle). e.preventDefault/stopPropagation כי הכפתור בדרך כלל
// יושב ליד/בתוך כרטיס שהוא עצמו קישור לעמוד האדם.
export default function PersonFavoriteToggle({
  personId,
  initialFavorite,
  className = "",
}: {
  personId: number;
  initialFavorite: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [saving, setSaving] = useState(false);

  async function toggle(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    const next = !favorite;
    setFavorite(next); // עדכון אופטימי; מתבטל חזרה אם הבקשה נכשלת
    try {
      const res = await fetch(`/api/people/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setFavorite(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      title={favorite ? "הסרה מהמועדפים" : "סימון כשחקן/ית או במאי/ית אהוב/ה"}
      className={`leading-none disabled:opacity-60 ${
        favorite ? "text-red-500" : "text-neutral-400 hover:text-red-300"
      } ${className}`}
    >
      {favorite ? "❤" : "🤍"}
    </button>
  );
}
