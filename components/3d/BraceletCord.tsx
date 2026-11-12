"use client";

import { Torus } from "@react-three/drei";
import { useState } from "react";
import { useBraceletStore } from "@/lib/store";
import { ThreeEvent } from "@react-three/fiber";
import { beadSpacing } from "@/lib/bead-model";

interface BraceletCordProps {
  radius: number;      // bracelet ring radius (Three.js units)
  tubeRadius?: number; // cord thickness
  onPlaceBead: (beadId: string, angle: number) => void;
}

export default function BraceletCord({
  radius,
  tubeRadius = 0.04,
  onPlaceBead,
}: BraceletCordProps) {
  const selectedBeadType = useBraceletStore(s => s.selectedBeadType);
  const [hoverAngle, setHoverAngle] = useState<number | null>(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (selectedBeadType) {
      const angle = hoverAngle ?? Math.atan2(e.point.z, e.point.x);
      onPlaceBead(selectedBeadType.id, angle);
    }
  };

  const previewRadius = selectedBeadType ? beadSpacing(selectedBeadType) / 20 : 0;

  return (
    <>
    <Torus
      args={[radius, tubeRadius, 16, 128]}
      rotation={[Math.PI / 2, 0, 0]}
      onClick={handleClick}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (selectedBeadType) {
          e.stopPropagation();
          setHoverAngle(Math.atan2(e.point.z, e.point.x));
          document.body.style.cursor = "copy";
        }
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (selectedBeadType) setHoverAngle(Math.atan2(e.point.z, e.point.x));
      }}
      onPointerOut={() => {
        setHoverAngle(null);
        document.body.style.cursor = "auto";
      }}
    >
      <meshStandardMaterial
        color="#E8C5C5"
        metalness={0.0}
        roughness={0.8}
      />
    </Torus>
    {selectedBeadType && hoverAngle !== null && <mesh
      position={[Math.cos(hoverAngle) * radius, 0, Math.sin(hoverAngle) * radius]}
      raycast={() => null}
    >
      <sphereGeometry args={[previewRadius, 24, 16]} />
      <meshBasicMaterial color={selectedBeadType.color} transparent opacity={0.35} depthWrite={false} />
    </mesh>}
    </>
  );
}
