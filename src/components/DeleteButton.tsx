"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("למחוק את הכותר הזה מהרשימה?")) return;
    setLoading(true);
    try {
      await fetch(`/api/titles/${id}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-400 underline mt-2 disabled:opacity-60"
    >
      {loading ? "מוחק..." : "הסרה מהרשימה"}
    </button>
  );
}
