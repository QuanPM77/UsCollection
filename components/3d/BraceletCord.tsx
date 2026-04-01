"use client";

/**
 * BraceletCord — renders the elastic cord as a Torus geometry.
 * Sits behind all beads to simulate the string holding them.
 */

import { Torus } from "@react-three/drei";

interface BraceletCordProps {
  radius: number;      // bracelet ring radius (Three.js units)
  tubeRadius?: number; // cord thickness
}

export default function BraceletCord({
  radius,
  tubeRadius = 0.04,
}: BraceletCordProps) {
  return (
    <Torus
      args={[radius, tubeRadius, 16, 128]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <meshStandardMaterial
        color="#E8C5C5"
        metalness={0.0}
        roughness={0.8}
      />
    </Torus>
  );
}
