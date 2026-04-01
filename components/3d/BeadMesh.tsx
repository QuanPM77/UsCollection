"use client";

/**
 * BeadMesh — renders a single bead sphere in the 3D scene.
 * Handles hover highlight and click-to-fill interactions.
 */

import { useRef, useState } from "react";
import { Mesh, Vector3 } from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import { BeadType } from "@/types";
import { useBraceletStore } from "@/lib/store";

interface BeadMeshProps {
  position: [number, number, number];
  slotIndex: number;
  beadType: BeadType | null;
  beadRadius?: number;
}

const EMPTY_COLOR = "#F5D0DE";
const EMPTY_EMISSIVE = "#FFB6C8";
const HOVER_SCALE = 1.15;

const _targetVec = new Vector3();

export default function BeadMesh({
  position,
  slotIndex,
  beadType,
  beadRadius = 0.38,
}: BeadMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const { fillSlot, clearSlot, setHoveredSlot } = useBraceletStore();

  // Smooth scale animation on hover
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetScale = hovered ? HOVER_SCALE : 1.0;
    _targetVec.set(targetScale, targetScale, targetScale);
    meshRef.current.scale.lerp(_targetVec, 1 - Math.pow(0.001, delta));
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    fillSlot(slotIndex);
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    clearSlot(slotIndex);
  };

  const color = beadType?.color ?? EMPTY_COLOR;
  const emissive = beadType?.emissive ?? (hovered ? EMPTY_EMISSIVE : "#FFD1DC");
  const metalness = beadType?.metalness ?? 0.05;
  const roughness = beadType?.roughness ?? 0.6;

  return (
    <Sphere
      ref={meshRef}
      args={[beadRadius, 32, 32]}
      position={position}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        setHoveredSlot(slotIndex);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        setHoveredSlot(null);
        document.body.style.cursor = "auto";
      }}
    >
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={hovered ? 0.4 : 0.1}
        metalness={metalness}
        roughness={roughness}
        envMapIntensity={1.2}
      />
    </Sphere>
  );
}
