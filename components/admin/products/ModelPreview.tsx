"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import GlbBead from "@/components/3d/GlbBead";
import type { BeadModel } from "@/lib/bead-model";

export default function ModelPreview({ model, onReady, onError }: { model: BeadModel; onReady?: () => void; onError?: () => void }) {
  const radius = Math.max(model.widthMm / 10, 1);
  return <div className="h-72 overflow-hidden rounded-xl bg-slate-100" aria-label="Xem trước mô hình 3D trên dây">
    <Canvas key={radius} camera={{ position: [radius * 1.7, radius * 2.3, radius * 2], fov: 38 }} dpr={[1, 1.5]}>
      <color attach="background" args={["#edf0f4"]} />
      <ambientLight intensity={0.8} /><directionalLight position={[4, 8, 5]} intensity={2} />
      <Suspense fallback={null}><Environment resolution={128}>
        <Lightformer intensity={3} position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={2} position={[4, 2, 5]} scale={[6, 6, 1]} />
      </Environment></Suspense>
      <GlbBead model={model} onReady={onReady} onError={onError} fallback={<mesh><sphereGeometry args={[.2, 16, 16]} /><meshStandardMaterial color="#9ca3af" /></mesh>} />
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.025, .025, radius * 3, 12]} /><meshStandardMaterial color="#a3a3a3" /></mesh>
      <OrbitControls makeDefault enablePan={false} />
    </Canvas>
  </div>;
}
