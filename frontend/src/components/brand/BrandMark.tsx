import Image from "next/image";
import clsx from "clsx";
import { isUnoptimizedImage } from "@/lib/image";

/** A brand's logo, or its initials in a gold-edged circle when it hasn't got one. */
export function BrandMark({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
}) {
  const initials = name
    .split(/[\s_&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  return (
    <div
      className={clsx(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink/10 bg-white",
        className ?? "h-16 w-16",
      )}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          fill
          sizes="96px"
          className="object-contain p-2"
          unoptimized={isUnoptimizedImage(logoUrl)}
        />
      ) : (
        <span aria-hidden="true" className="font-display text-lg text-gold-deep">
          {initials}
        </span>
      )}
    </div>
  );
}
