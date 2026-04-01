"use client";

/**
 * BraceletCanvas — the main 3D scene.
 */

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";

import { useBraceletStore } from "@/lib/store";
import {
  circumferenceToRadius,
  generateBeadPositions,
} from "@/lib/braceletMath";
import { getBeadById } from "@/lib/beadData";

import BeadMesh from "./BeadMesh";
import BraceletCord from "./BraceletCord";

function BraceletScene() {
  const { wristCircumference, slots, isAutoRotating } = useBraceletStore();

  const radius = circumferenceToRadius(wristCircumference);
  const positions = generateBeadPositions(slots.length, radius);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
      <pointLight position={[-4, 3, -4]} intensity={0.8} color="#FFB6C8" />
      <pointLight position={[4, -2, 4]} intensity={0.4} color="#FFF0F5" />

      {/* Soft environment reflections */}
      <Environment preset="studio" />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={12}
        autoRotate={isAutoRotating}
        autoRotateSpeed={1.2}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Elastic cord ring */}
      <BraceletCord radius={radius} />

      {/* Bead spheres */}
      {slots.map((slot, i) => {
        const pos = positions[i];
        const beadType = slot.beadTypeId
          ? getBeadById(slot.beadTypeId) ?? null
          : null;
        return (
          <BeadMesh
            key={slot.index}
            position={[pos.x, pos.y, pos.z]}
            slotIndex={slot.index}
            beadType={beadType}
          />
        );
      })}
    </>
  );
}

export default function BraceletCanvas() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 3, 7], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <BraceletScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
