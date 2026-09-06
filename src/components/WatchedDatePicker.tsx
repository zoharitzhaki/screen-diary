"use client";

import { useEffect, useState } from "react";
import type { WatchedPrecision } from "@/lib/dates";

export type WatchedValue = {
  year: number;
  month: number | null;
  day: number | null;
  precision: WatchedPrecision;
} | null; // null = "לא צוין תאריך"

const today = new Date();

// בוחר תאריך צפייה עם דיוק גמיש: תאריך מדויק / חודש ושנה / שנה בלבד /
// בלי תאריך כלל. מדווח את הערך החוצה (onChange) בכל שינוי, ופעם אחת גם
// בעליה (useEffect עם מערך תלויות ריק, רק כדי לסנכרן את הערך ההתחלתי).
export default function WatchedDatePicker({
  onChange,
  allowNone = true,
}: {
  onChange: (value: WatchedValue) => void;
  allowNone?: boolean;
}) {
  type Mode = WatchedPrecision | "none";
  const [mode, setMode] = useState<Mode>("day");
  const [dateValue, setDateValue] = useState(() => today.toISOString().slice(0, 10));
  const [monthValue, setMonthValue] = useState(() => today.toISOString().slice(0, 7));
  const [yearValue, setYearValue] = useState(() => String(today.getFullYear()));

  // מדווח את הערך ההתחלתי להורה פעם אחת בעליה, כדי שגם אם המשתמש לא נוגע
  // בכלום ולוחץ ישר על שמירה, יהיה כבר ערך תקין (התאריך של היום).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => emit("day", {}), []);

  function emit(nextMode: Mode, next: { date?: string; month?: string; year?: string }) {
    const date = next.date ?? dateValue;
    const month = next.month ?? monthValue;
    const year = next.year ?? yearValue;
    if (nextMode === "none") {
      onChange(null);
      return;
    }
    if (nextMode === "day") {
      const [y, m, d] = date.split("-").map(Number);
      onChange({ year: y, month: m, day: d, precision: "day" });
    } else if (nextMode === "month") {
      const [y, m] = month.split("-").map(Number);
      onChange({ year: y, month: m, day: null, precision: "month" });
    } else {
      onChange({ year: Number(year), month: null, day: null, precision: "year" });
    }
  }

  const options: [Mode, string][] = [
    ["day", "תאריך מדויק"],
    ["month", "חודש ושנה"],
    ["year", "שנה בלבד"],
    ...(allowNone ? ([["none", "לא לציין תאריך"]] as [Mode, string][]) : []),
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-2 text-sm">
        {options.map(([value, label]) => (
          <label key={value} className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={mode === value}
              onChange={() => {
                setMode(value);
                emit(value, {});
              }}
            />
            {label}
          </label>
        ))}
      </div>
      {mode === "day" && (
        <input
          type="date"
          value={dateValue}
          onChange={(e) => {
            setDateValue(e.target.value);
            emit("day", { date: e.target.value });
          }}
          className="block w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
        />
      )}
      {mode === "month" && (
        <input
          type="month"
          value={monthValue}
          onChange={(e) => {
            setMonthValue(e.target.value);
            emit("month", { month: e.target.value });
          }}
          className="block w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
        />
      )}
      {mode === "year" && (
        <input
          type="number"
          min={1900}
          max={today.getFullYear() + 1}
          value={yearValue}
          onChange={(e) => {
            setYearValue(e.target.value);
            emit("year", { year: e.target.value });
          }}
          className="block w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2"
        />
      )}
    </div>
  );
}
