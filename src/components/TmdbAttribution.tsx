export default function TmdbAttribution() {
  return (
    <p className="mt-10 text-xs text-neutral-600 text-center">
      נתוני הסרטים, הסדרות והשחקנים, כולל התמונות, מגיעים מ-
      <a
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noreferrer"
        className="underline mx-1"
      >
        TMDB
      </a>
      . מוצר זה משתמש ב-API של TMDB אך אינו מאושר או מוסמך על ידה.
    </p>
  );
}
