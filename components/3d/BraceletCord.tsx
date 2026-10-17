"use client";

import { Torus } from "@react-three/drei";
import { useBraceletStore } from "@/lib/store";
import { ThreeEvent } from "@react-three/fiber";

interface BraceletCordProps {
  radius: number;      // bracelet ring radius (Three.js units)
  tubeRadius?: number; // cord thickness
}

export default function BraceletCord({
  radius,
  tubeRadius = 0.04,
}: BraceletCordProps) {
  const { selectedBeadType, addBead } = useBraceletStore();

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (selectedBeadType) {
      addBead(selectedBeadType.id);
    }
  };

  return (
    <Torus
      args={[radius, tubeRadius, 16, 128]}
      rotation={[Math.PI / 2, 0, 0]}
      onClick={handleClick}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (selectedBeadType) {
          e.stopPropagation();
          document.body.style.cursor = "copy";
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <meshStandardMaterial
        color="#E8C5C5"
        metalness={0.0}
        roughness={0.8}
      />
    </Torus>
  );
}
