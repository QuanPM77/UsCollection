"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { BeadModel } from "@/lib/bead-model";
import { getBeadVisual } from "@/lib/beadVisuals";
import BeadModelThumbnail from "@/components/ui/BeadModelThumbnail";
interface BeadSwatchProps {
  beadId?: string | null;
  model?: BeadModel;
  thumbnail?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
  showModelFallback?: boolean;
}
export default function BeadSwatch({ beadId, model, thumbnail: explicitThumbnail, color, className = "", style, showModelFallback = false }: BeadSwatchProps) {
  const bundledThumbnail = getBeadVisual(beadId)?.thumbnail;
  const modelThumbnail = explicitThumbnail ?? model?.thumbnail;
  const thumbnails = explicitThumbnail || model?.thumbnailSource === "photo"
    ? [modelThumbnail, bundledThumbnail]
    : [bundledThumbnail, modelThumbnail];
  const [failedThumbnails, setFailedThumbnails] = useState<string[]>([]);
  useEffect(() => { setFailedThumbnails([]); }, [beadId, modelThumbnail, bundledThumbnail]);
  const thumbnail = thumbnails.find((src) => src && !failedThumbnails.includes(src));

  if (thumbnail) return (
    // eslint-disable-next-line @next/next/no-img-element -- small thumbnail generated from this model
    <img src={thumbnail} alt="" loading="lazy" className={className + " object-contain bg-white"} style={style}
      onError={() => setFailedThumbnails((failed) => failed.includes(thumbnail) ? failed : [...failed, thumbnail])} />
  );
  if (showModelFallback && model?.url) return <BeadModelThumbnail model={model} className={className} style={style} color={color ?? "#ccc"} />;
  return <span className={"block " + className} style={{ backgroundColor: color ?? "#ccc", ...style }} />;
}
