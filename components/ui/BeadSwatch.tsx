import type { CSSProperties } from "react";
import { getBeadVisual } from "@/lib/beadVisuals";

interface BeadSwatchProps {
  beadId?: string | null;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/** Bead preview: thumbnail for beads with a texture/model, otherwise a color dot. */
export default function BeadSwatch({ beadId, color, className = "", style }: BeadSwatchProps) {
  const visual = getBeadVisual(beadId);
  if (visual) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny static thumbnail
      <img src={visual.thumbnail} alt="" loading="lazy" className={`${className} object-cover bg-white`} style={style} />
    );
  }
  return <span className={`block ${className}`} style={{ backgroundColor: color ?? "#ccc", ...style }} />;
}
