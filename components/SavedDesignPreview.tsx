"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Torus } from "@react-three/drei";
import type { SavedDesign } from "@/lib/saved-design";
import { calculateRadiusFromBeads, generateVariableBeadPositions } from "@/lib/braceletMath";
import { beadSpacing } from "@/lib/bead-model";
import GlbBead from "@/components/3d/GlbBead";

function SavedBead({ bead, angle, radius }: {
  bead: SavedDesign["config"]["beads"][number];
  angle: number;
  radius: number;
}) {
  const color = bead.color || "#F5D0DE";
  if (bead.model) return <group position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
    <GlbBead model={bead.model} angle={angle} fallback={<mesh><sphereGeometry args={[bead.diameter / 20, 24, 20]} /><meshStandardMaterial color={color} roughness={bead.roughness} metalness={bead.metalness} /></mesh>} />
  </group>;
  return <mesh position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
    <sphereGeometry args={[bead.diameter / 20, 24, 20]} />
    <meshStandardMaterial color={color} emissive={bead.emissive || "#FFD1DC"} emissiveIntensity={0.1} metalness={bead.metalness} roughness={bead.roughness} envMapIntensity={1.2} />
  </mesh>;
}

function SavedDesignScene({ design }: { design: SavedDesign }) {
  const beadsById = useMemo(() => new Map(design.config.beads.map(bead => [bead.id, bead])), [design.config.beads]);
  const { radius, angles } = useMemo(() => {
    const spacings = design.config.slots.map(slot => beadSpacing(slot.beadTypeId ? beadsById.get(slot.beadTypeId) : null));
    const radius = calculateRadiusFromBeads(spacings, design.config.wristCircumference);
    const positions = generateVariableBeadPositions(spacings, design.config.wristCircumference);
    return {
      radius,
      angles: design.config.slots.map((slot, index) => slot.angle ?? positions[index]?.angle ?? -Math.PI / 2),
    };
  }, [beadsById, design.config.slots, design.config.wristCircumference]);

  return <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 8, 5]} intensity={1.4} />
    <pointLight position={[-4, 3, -4]} intensity={0.8} color="#FFB6C8" />
    <pointLight position={[4, -2, 4]} intensity={0.4} color="#FFF0F5" />
    <Suspense fallback={null}><Environment preset="studio" /></Suspense>
    <Torus args={[radius, 0.04, 16, 128]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#E8C5C5" metalness={0} roughness={0.8} />
    </Torus>
    {design.config.slots.map((slot, index) => {
      const bead = slot.beadTypeId ? beadsById.get(slot.beadTypeId) : undefined;
      if (!bead) return null;
      return <SavedBead key={`${slot.index}-${index}`} bead={bead} angle={angles[index]} radius={radius} />;
    })}
  </>;
}

export default function SavedDesignPreview({ design }: { design: SavedDesign }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={container} className="h-48 w-full overflow-hidden rounded-2xl bg-pink-light/50" aria-label={`Ảnh xem trước vòng ${design.name}`}>
    {visible && <Canvas frameloop="demand" camera={{ position: [0, 3, 7], fov: 45 }} dpr={[1, 1.25]} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}>
      <Suspense fallback={null}><SavedDesignScene design={design} /></Suspense>
    </Canvas>}
  </div>;
}
