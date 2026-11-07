import Image from "next/image";
import logo from "@/public/images/usstory-logo.webp";

export default function BrandLogo({ className = "w-32", sizes = "176px" }: { className?: string; sizes?: string }) {
  return (
    <Image
      src={logo}
      alt="UsStory"
      sizes={sizes}
      quality={90}
      className={`h-auto ${className}`}
    />
  );
}
