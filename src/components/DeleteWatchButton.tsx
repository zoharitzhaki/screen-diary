"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteWatchButton({ titleId, watchId }: { titleId: number; watchId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/titles/${titleId}/watches/${watchId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="מחיקת תאריך הצפייה הזה"
      className="text-neutral-600 hover:text-red-400 disabled:opacity-60"
    >
      ✕
    </button>
  );
}
