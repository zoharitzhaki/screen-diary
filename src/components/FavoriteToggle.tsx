"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";

// כוכבית "ממש אהבתי את זה" ליד כותר. e.preventDefault/stopPropagation כי
// ברוב המקומות הכפתור יושב בתוך/ליד כרטיס שהוא עצמו קישור לעמוד הכותר -
// בלי זה לחיצה על הכוכבית הייתה גם מנווטת לעמוד.
export default function FavoriteToggle({
  titleId,
  initialFavorite,
  className = "",
}: {
  titleId: number;
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
      const res = await fetch(`/api/titles/${titleId}`, {
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
      title={favorite ? "הסרה מהמועדפים" : "סימון כאהוב במיוחד"}
      className={`leading-none disabled:opacity-60 ${
        favorite ? "text-yellow-400" : "text-neutral-400 hover:text-yellow-300"
      } ${className}`}
    >
      {favorite ? "★" : "☆"}
    </button>
  );
}
