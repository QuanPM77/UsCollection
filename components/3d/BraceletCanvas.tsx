"use client";

/**
 * BraceletCanvas — the main 3D scene.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Plane, Vector2, Vector3 } from "three";
import { useThree } from "@react-three/fiber";

import { useBraceletStore } from "@/lib/store";
import {
  calculateRadiusFromBeads,
  generateVariableBeadPositions,
} from "@/lib/braceletMath";

import BeadMesh from "./BeadMesh";
import BraceletCord from "./BraceletCord";
import { beadSpacing } from "@/lib/bead-model";

type DropPlacement = (beadId: string, clientX: number, clientY: number) => boolean;

function BraceletScene({ dropPlacementRef }: {
  dropPlacementRef: MutableRefObject<DropPlacement | null>;
}) {
  const { wristCircumference, slots, beadCatalog, isAutoRotating, canvasTheme } = useBraceletStore(useShallow(s => ({ wristCircumference: s.wristCircumference, slots: s.slots, beadCatalog: s.beadCatalog, isAutoRotating: s.isAutoRotating, canvasTheme: s.canvasTheme })));
  const { camera, gl, raycaster } = useThree();

  const { radius, positions } = useMemo(() => {
  const diameters = slots.map((s) => {
    const bead = s.beadTypeId ? beadCatalog.find((item) => item.id === s.beadTypeId) : null;
    return beadSpacing(bead);
  });

  const radius = calculateRadiusFromBeads(diameters, wristCircumference);
  const basePositions = generateVariableBeadPositions(diameters, wristCircumference);
  const positions = basePositions.map((position, index) => {
    const fixedAngle = slots[index]?.angle;
    if (fixedAngle === undefined || !Number.isFinite(fixedAngle)) return position;
    return { ...position, x: Math.cos(fixedAngle) * radius, z: Math.sin(fixedAngle) * radius, angle: fixedAngle };
  });

  return { radius, positions };
  }, [slots, beadCatalog, wristCircumference]);

  const placeBeadAtAngle = useCallback((beadId: string, angle: number) => {
    const state = useBraceletStore.getState();
    const before = state.slots.length;
    const existingAngles = state.slots.map((slot, index) => slot.angle ?? positions[index]?.angle ?? -Math.PI / 2);
    state.stopAutoRotate();
    state.addBead(beadId, { angle, existingAngles });
    return useBraceletStore.getState().slots.length > before;
  }, [positions]);

  useEffect(() => {
    dropPlacementRef.current = (beadId, clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const pointer = new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const point = raycaster.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
      return point ? placeBeadAtAngle(beadId, Math.atan2(point.z, point.x)) : false;
    };
    return () => { dropPlacementRef.current = null; };
  }, [camera, gl, raycaster, dropPlacementRef, placeBeadAtAngle]);

  // Environment HDRI Preset per theme
  const envPreset = canvasTheme === "dark" ? "night" : canvasTheme === "white" ? "apartment" : "studio";

  return (
    <>
      {/* Dynamic Themed Lighting */}
      {canvasTheme === "dark" ? (
        <>
          <ambientLight intensity={0.4} color="#CBD5E1" />
          <directionalLight position={[5, 10, 5]} intensity={2.2} color="#F8FAFC" castShadow />
          <pointLight position={[-5, 4, -5]} intensity={1.5} color="#38BDF8" /> {/* Cyan Rim Light */}
          <pointLight position={[5, -3, 5]} intensity={1.2} color="#C084FC" /> {/* Purple Glow */}
        </>
      ) : canvasTheme === "white" ? (
        <>
          <ambientLight intensity={0.75} color="#FFFFFF" />
          <directionalLight position={[6, 9, 4]} intensity={1.6} color="#FFFDF0" castShadow />
          <pointLight position={[-4, 4, -4]} intensity={0.6} color="#E0F2FE" />
          <pointLight position={[4, -2, 4]} intensity={0.5} color="#FEF3C7" /> {/* Warm Studio Fill */}
        </>
      ) : (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
          <pointLight position={[-4, 3, -4]} intensity={0.8} color="#FFB6C8" />
          <pointLight position={[4, -2, 4]} intensity={0.4} color="#FFF0F5" />
        </>
      )}

      {/* Dynamic Environment Reflections */}
      <Environment preset={envPreset} />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={12}
        autoRotate={isAutoRotating}
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Elastic cord ring */}
      <BraceletCord radius={radius} onPlaceBead={placeBeadAtAngle} />

      {/* Bead spheres */}
      {slots.map((slot, i) => {
        const pos = positions[i];
        if (!pos) return null;

        const beadType = slot.beadTypeId
          ? beadCatalog.find((item) => item.id === slot.beadTypeId) ?? null
          : null;
        const beadRadius = beadType ? beadType.diameter / 20 : 0.4;

        return (
          <BeadMesh
            key={slot.index}
            position={[pos.x, pos.y, pos.z]}
            slotIndex={slot.index}
            beadType={beadType}
            beadRadius={beadRadius}
            angle={pos.angle}
          />
        );
      })}
    </>
  );
}

export default function BraceletCanvas() {
  const addBead = useBraceletStore((state) => state.addBead);
  const stopAutoRotate = useBraceletStore((state) => state.stopAutoRotate);
  const selectedBeadType = useBraceletStore((state) => state.selectedBeadType);
  const dropPlacementRef = useRef<DropPlacement | null>(null);
  const canvasTheme = useBraceletStore(s => s.canvasTheme);
  const setCanvasTheme = useBraceletStore(s => s.setCanvasTheme);
  const isAutoRotating = useBraceletStore(s => s.isAutoRotating);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const beadId = e.dataTransfer.getData("text/plain");
    if (beadId) {
      stopAutoRotate();
      if (dropPlacementRef.current?.(beadId, e.clientX, e.clientY)) return;
      addBead(beadId);
    }
  };

  const bgStyle =
    canvasTheme === "dark"
      ? "bg-gradient-to-br from-zinc-950 via-slate-900 to-black border-zinc-800/80 shadow-2xl"
      : canvasTheme === "white"
      ? "bg-gradient-to-br from-slate-50 via-zinc-100/90 to-stone-200/70 border-zinc-200/80 shadow-md"
      : "bg-gradient-to-br from-pink-light via-pink-blush/40 to-white border-pink-mid/30 shadow-sm";


  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden transition-colors duration-300 border ${bgStyle}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {selectedBeadType && <p className="absolute right-3 top-3 z-20 rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-pink-text shadow" aria-live="polite">
        Rê chuột trên dây để canh, bấm để đặt {selectedBeadType.name}
      </p>}
      {/* Floating Theme Switcher Overlay (Top Left) */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md p-1 rounded-full border border-pink-mid/30 shadow-md">
        <button
          onClick={() => setCanvasTheme("pink")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
            canvasTheme === "pink"
              ? "bg-pink-deep text-white shadow-sm"
              : "text-pink-text/70 hover:text-pink-text"
          }`}
          title="Chủ đề Hồng Pastel"
        >
          <span>🌸</span> Hồng
        </button>
        <button
          onClick={() => setCanvasTheme("white")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
            canvasTheme === "white"
              ? "bg-gray-800 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
          title="Chủ đề Trắng Studio"
        >
          <span>⚪</span> Trắng
        </button>
        <button
          onClick={() => setCanvasTheme("dark")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
            canvasTheme === "dark"
              ? "bg-zinc-900 text-amber-300 border border-zinc-700 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
          title="Chủ đề Đen Luxury"
        >
          <span>🌙</span> Đen
        </button>
      </div>

      <Canvas
        frameloop={isAutoRotating ? "always" : "demand"}
        camera={{ position: [0, 3, 7], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <BraceletScene dropPlacementRef={dropPlacementRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}

