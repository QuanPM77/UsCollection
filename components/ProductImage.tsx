import Image from "next/image";

// Optimize local files and public Supabase product images; preserve legacy external URLs.
export default function ProductImage({ src, alt, sizes = "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw", priority = false, className = "" }: {
  src: string; alt: string; sizes?: string; priority?: boolean; className?: string;
}) {
  const optimized = (src.startsWith("/") && !src.startsWith("//")) || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(src);
  return <span className="relative block h-full w-full"><Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={!optimized} className={`object-contain ${className}`} /></span>;
}
