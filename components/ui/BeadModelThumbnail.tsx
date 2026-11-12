"use client";

import { Suspense, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import type { BeadModel } from "@/lib/bead-model";
import GlbBead from "@/components/3d/GlbBead";

export default function BeadModelThumbnail({ model, className, style, color }: {
  model: BeadModel;
  className: string;
  style?: CSSProperties;
  color: string;
}) {
  const fallback = <mesh><sphereGeometry args={[0.35, 16, 16]} /><meshStandardMaterial color={color} /></mesh>;

  return <Canvas className={className} style={style} camera={{ position: [2.5, 2, 3], fov: 38 }} dpr={1}>
    <ambientLight intensity={1.2} />
    <directionalLight position={[3, 4, 5]} intensity={2} />
    <Suspense fallback={fallback}>
      <Bounds fit clip margin={1.35}>
        <GlbBead model={model} fallback={fallback} />
      </Bounds>
    </Suspense>
  </Canvas>;
}
