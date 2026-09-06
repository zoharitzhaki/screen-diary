import type { MetadataRoute } from "next";

// קובץ ה-manifest של ה-PWA - זה מה שמאפשר "הוספה למסך הבית" בטלפון
// ושהאפליקציה תיפתח כמו אפליקציה אמיתית (בלי סרגל הכתובת של הדפדפן),
// עם אייקון ושם משלה.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "יומן מסך",
    short_name: "יומן מסך",
    description: "אפליקציה אישית למעקב אחרי סרטים וסדרות שצפיתי בהם",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
