// עוזר לתאריכי צפייה עם דיוק משתנה: יום מדויק, חודש+שנה, או שנה בלבד.
// תאריך צפייה הוא אופציונלי לגמרי ברמת הכותר (אפשר לא לציין תאריך כלל),
// ולכל כותר יכולות להיות כמה "צפיות" (watch_events) - למשל צפייה חוזרת.
// תאריך היציאה/שידור המקורי, לעומת זאת, תמיד מגיע מ-TMDb כתאריך מלא ולא
// עובר דרך הקובץ הזה.

export type WatchedPrecision = "day" | "month" | "year";

export type WatchedDate = {
  year: number;
  month: number | null;
  day: number | null;
  precision: WatchedPrecision;
};

const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export function formatWatchedDate(w: WatchedDate): string {
  if (w.precision === "day" && w.month && w.day) {
    return `${String(w.day).padStart(2, "0")}.${String(w.month).padStart(2, "0")}.${w.year}`;
  }
  if (w.precision === "month" && w.month) {
    return `${HEBREW_MONTHS[w.month - 1]} ${w.year}`;
  }
  return `${w.year}`;
}

// משווה שתי תאריכי-צפייה לפי מי מהם "מאוחר יותר" (לצורך מיון "החדש ביותר
// קודם"). כשחודש/יום חסרים מתייחסים לזה כאילו זה "אחרי" (פחות עדיפות ב-
// מיון) ערך מדויק מאותה שנה/חודש, כדי שרשומה עמומה לא תקפוץ לפני רשומה
// מדויקת מאותה תקופה בערך.
// מתאים לשימוש ישיר כ-Array.prototype.sort(compareWatchedDesc): שלילי
// אומר ש-a מגיע קודם (כלומר מאוחר יותר בזמן).
export function compareWatchedDesc(
  a: Pick<WatchedDate, "year" | "month" | "day">,
  b: Pick<WatchedDate, "year" | "month" | "day">,
): number {
  if (a.year !== b.year) return b.year - a.year;
  const am = a.month ?? -1;
  const bm = b.month ?? -1;
  if (am !== bm) return bm - am;
  const ad = a.day ?? -1;
  const bd = b.day ?? -1;
  return bd - ad;
}

// ORDER BY שקול לאותה לוגיקה, לשימוש כשממיינים בתוך SQL (למשל צפיות של
// כותר בודד). מניח עמודות בשם year / month / day.
export const RECENCY_ORDER_BY_DESC = "year DESC, month IS NULL, month DESC, day IS NULL, day DESC";
