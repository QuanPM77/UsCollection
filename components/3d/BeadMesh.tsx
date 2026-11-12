"use client";


import { Suspense, useMemo, useRef, useState } from "react";
import { DoubleSide, Group, SRGBColorSpace, Texture, Vector3 } from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Sphere, Html, useGLTF, useTexture } from "@react-three/drei";
import { BeadType } from "@/types";
import { useBraceletStore } from "@/lib/store";
import GlbBead from "./GlbBead";
import { getBeadVisual, GLB_TO_SCENE, type TexturedBeadVisual } from "@/lib/beadVisuals";

interface BeadMeshProps {
  position: [number, number, number];
  slotIndex: number;
  beadType: BeadType | null;
  beadRadius?: number;
  angle?: number;
}
const EMPTY_COLOR = "#F5D0DE";
const EMPTY_EMISSIVE = "#FFB6C8";
const HOVER_SCALE = 1.15;

const _targetVec = new Vector3();

/** Sphere material from a photo texture (+ optional normal map, AB sheen, transparency). */
function TexturedBeadMaterial({ visual, hovered }: { visual: TexturedBeadVisual; hovered: boolean }) {
  const urls: Record<string, string> = visual.normalMap ? { map: visual.map, normalMap: visual.normalMap } : { map: visual.map };
  const maps = useTexture(urls) as { map: Texture; normalMap?: Texture };
  maps.map.colorSpace = SRGBColorSpace; // only the color map is sRGB (idempotent)

  return (
    <meshPhysicalMaterial
      {...maps}
      color="#ffffff"
      emissive="#ffffff"
      emissiveIntensity={hovered ? 0.08 : 0}
      metalness={0}
      roughness={visual.roughness ?? 0.12}
      clearcoat={visual.clearcoat ?? 0}
      clearcoatRoughness={visual.clearcoatRoughness ?? 0.05}
      iridescence={visual.iridescence ?? 0}
      iridescenceIOR={visual.iridescenceIOR ?? 1.3}
      iridescenceThicknessRange={visual.iridescenceThicknessRange ?? [100, 400]}
      transmission={visual.transmission ?? 0}
      thickness={visual.thickness ?? 0}
      ior={visual.ior ?? 1.5}
      attenuationColor={visual.attenuationColor ?? "#ffffff"}
      attenuationDistance={visual.attenuationDistance ?? Infinity}
      envMapIntensity={1.2}
    />
  );
}

/** Two cut-out shells inside a glass bead: cracks seen through (and refracted by) the outer glass. */
const CRACK_SHELLS = [
  { scale: 0.86, rotation: [0.4, 0.9, 0] as const, glow: 0.9 },
  { scale: 0.62, rotation: [1.7, 2.6, 0.5] as const, glow: 0.6 },
];

function InnerCracks({ url, radius }: { url: string; radius: number }) {
  const texture = useTexture(url) as Texture;
  texture.colorSpace = SRGBColorSpace;
  return (
    <>
      {CRACK_SHELLS.map((shell, i) => (
        <Sphere key={i} args={[radius * shell.scale, 48, 32]} rotation={[...shell.rotation]}>
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={shell.glow}
            alphaTest={0.2}
            side={DoubleSide}
            roughness={0.15}
            metalness={0.2}
          />
        </Sphere>
      ))}
    </>
  );
}

/** GLB bead/charm; files are in metres, the scene uses 1 unit = 10 mm. */
function BeadModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={model} scale={GLB_TO_SCENE} />;
}

export default function BeadMesh({
  position,
  slotIndex,
  beadType,
  beadRadius = 0.4,
  angle = -Math.PI / 2,
}: BeadMeshProps) {
  const meshRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  const fillSlot = useBraceletStore(s => s.fillSlot);
  const removeBead = useBraceletStore(s => s.removeBead);
  const setHoveredSlot = useBraceletStore(s => s.setHoveredSlot);

  // Smooth scale animation on hover
  useFrame(({ invalidate }, delta) => {
    if (!meshRef.current) return;
    const targetScale = hovered ? HOVER_SCALE : 1.0;
    _targetVec.set(targetScale, targetScale, targetScale);
    if (Math.abs(meshRef.current.scale.x - targetScale) < 0.001) {
      meshRef.current.scale.copy(_targetVec);
      return;
    }
    meshRef.current.scale.lerp(_targetVec, 1 - Math.pow(0.001, Math.min(delta, 0.05)));
    invalidate();
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

  const visual = getBeadVisual(beadType?.id);
  // Models face +Z: turn that toward the outside of the ring (X then follows the cord).
  const facing = Math.atan2(position[0], position[2]);

  const plainMaterial = (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={hovered ? 0.4 : 0.1}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={1.2}
    />
  );
  const plainSphere = <Sphere args={[beadRadius, 32, 32]}>{plainMaterial}</Sphere>;

  return (
    <group position={position}>
      <group
        ref={meshRef}
        rotation={[0, beadType?.model ? 0 : facing, 0]}
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
        {beadType?.model ? (
          <GlbBead model={beadType.model} angle={angle} fallback={plainSphere} />
        ) : visual?.kind === "model" ? (
          <Suspense fallback={plainSphere}>
            <BeadModel url={visual.url} />
          </Suspense>
        ) : visual?.kind === "texture" ? (
          <>
            <Sphere args={[beadRadius, 48, 32]}>
              <Suspense fallback={plainMaterial}>
                <TexturedBeadMaterial visual={visual} hovered={hovered} />
              </Suspense>
            </Sphere>
            {visual.cracksMap && (
              <Suspense fallback={null}>
                <InnerCracks url={visual.cracksMap} radius={beadRadius} />
              </Suspense>
            )}
          </>
        ) : (
          plainSphere
        )}
      </group>

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
