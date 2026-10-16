"use client";

/**
 * BeadMesh — renders a single bead sphere in the 3D scene.
 * Handles hover highlight and click-to-fill interactions.
 */

import { useRef, useState } from "react";
import { Mesh, Vector3 } from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Sphere, Html } from "@react-three/drei";
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
  beadRadius = 0.4,
}: BeadMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const { fillSlot, removeBead, setHoveredSlot } = useBraceletStore();

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
    removeBead(slotIndex);
  };

  const color = beadType?.color ?? EMPTY_COLOR;
  const emissive = beadType?.emissive ?? (hovered ? EMPTY_EMISSIVE : "#FFD1DC");
  const metalness = beadType?.metalness ?? 0.05;
  const roughness = beadType?.roughness ?? 0.6;

  return (
    <group position={position}>
      <Sphere
        ref={meshRef}
        args={[beadRadius, 32, 32]}
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

      {/* Floating Trash Can Button on Hover */}
      {hovered && (
        <Html position={[0, beadRadius + 0.35, 0]} center zIndexRange={[100, 0]}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBead(slotIndex);
            }}
            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-full shadow-lg transition-transform hover:scale-110 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Xóa hạt này"
          >
            <span>🗑️</span> Xóa
          </button>
        </Html>
      )}
    </group>
  );
}

