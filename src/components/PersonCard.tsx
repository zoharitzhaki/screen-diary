import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import PersonFavoriteToggle from "@/components/PersonFavoriteToggle";

export default function PersonCard({
  personId,
  name,
  profilePath,
  subtitle,
  favorite = false,
}: {
  personId: number;
  name: string;
  profilePath: string | null;
  subtitle?: string | null;
  favorite?: boolean;
}) {
  const photo = tmdbImageUrl(profilePath, "w185");
  return (
    <div className="relative">
      <PersonFavoriteToggle
        personId={personId}
        initialFavorite={favorite}
        className="absolute top-1 right-1 z-10 text-sm drop-shadow"
      />
      <Link href={`/person/${personId}`} className="block group">
        <div className="aspect-[2/3] rounded-md overflow-hidden bg-neutral-900">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={name}
              className="w-full h-full object-cover group-hover:opacity-80 transition"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs p-1 text-center">
              {name}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs font-medium truncate group-hover:underline">{name}</p>
        {subtitle && <p className="text-xs text-neutral-500 truncate">{subtitle}</p>}
      </Link>
    </div>
  );
}
