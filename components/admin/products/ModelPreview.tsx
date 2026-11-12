"use client";

import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, TransformControls, Bounds, useGLTF } from "@react-three/drei";
import { Box3, Group, Mesh, Vector3, type Material, type PerspectiveCamera } from "three";
import type { BeadModel, ModelSettings } from "@/lib/bead-model";
import { anchorQuaternion, modelDimensions } from "@/lib/model-transform";
import GlbBead from "@/components/3d/GlbBead";

type Props = {
  model: BeadModel;
  onChange?: (settings: ModelSettings) => void;
  onBeginChange?: () => void;
  onReady?: () => void;
  onError?: () => void;
  captureRef?: MutableRefObject<(() => string) | null>;
};
class PreviewBoundary extends Component<{ children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? <p role="alert" className="p-4 text-red-700">Không đọc được model 3D. Hãy chọn lại file hợp lệ.</p> : this.props.children; }
}
function Lighting() {
  return <><ambientLight intensity={0.8} /><directionalLight position={[4, 8, 5]} intensity={2} />
    <Suspense fallback={null}><Environment resolution={128}>
      <Lightformer intensity={3} position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
      <Lightformer intensity={2} position={[4, 2, 5]} scale={[6, 6, 1]} />
    </Environment></Suspense></>;
}
function CameraView({ view, radius }: { view: string; radius: number }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const p = view === "front" ? [0, 0, 3] : view === "side" ? [3, 0, 0] : view === "top" ? [0, 3, 0.001] : [1.7, 1.5, 2.3];
    camera.position.set(p[0] * radius, p[1] * radius, p[2] * radius);
    camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); invalidate();
  }, [camera, invalidate, view, radius]);
  return null;
}
function AnchorEditor({ model, mode, transparent, snap, onChange, onBeginChange, view }: Props & { mode: "view" | "translate" | "rotate" | "pick"; transparent: boolean; snap: boolean; view: string }) {
  const { scene } = useGLTF(model.url, false, false);
  const anchor = useRef<Group>(null!);
  const { scale, center, size } = useMemo(() => modelDimensions(scene, model.widthMm), [scene, model.widthMm]);
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse(node => {
      if (!(node instanceof Mesh)) return;
      const material = (m: Material) => { const c = m.clone(); if (transparent) { c.transparent = true; c.opacity = 0.28; c.depthWrite = false; } return c; };
      node.material = Array.isArray(node.material) ? node.material.map(material) : material(node.material);
    });
    return copy;
  }, [scene, transparent]);
  useEffect(() => () => { clone.traverse(node => { if (node instanceof Mesh) (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => m.dispose()); }); }, [clone]);
  useLayoutEffect(() => {
    anchor.current.position.fromArray(model.holeCenter).divideScalar(10);
    anchor.current.quaternion.copy(anchorQuaternion(model));
  }, [model]);
  const radius = Math.max(size.length() * scale, 1);
  const update = () => {
    const position = anchor.current.position.clone().multiplyScalar(10).clampScalar(-80, 80);
    anchor.current.position.copy(position).divideScalar(10);
    onChange?.({ ...model, holeCenter: position.toArray() as [number, number, number], anchorRotation: anchor.current.quaternion.clone().normalize().toArray() as [number, number, number, number] });
  };
  const pick = (event: ThreeEvent<MouseEvent>) => {
    if (mode !== "pick") return;
    event.stopPropagation(); onBeginChange?.();
    onChange?.({ ...model, holeCenter: event.point.clone().multiplyScalar(10).clampScalar(-80, 80).toArray() as [number, number, number] });
  };
  return <>
    <CameraView view={view} radius={radius} />
    <group position={center.clone().multiplyScalar(-scale)} onClick={pick}><primitive object={clone} scale={scale} dispose={null} /></group>
    <group ref={anchor}>
      <mesh renderOrder={10}><sphereGeometry args={[0.045, 16, 16]} /><meshBasicMaterial color="#e11d48" depthTest={false} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} renderOrder={9}><cylinderGeometry args={[.012, .012, radius * 2, 12]} /><meshBasicMaterial color="#e11d48" depthTest={false} transparent opacity={0.7} /></mesh>
    </group>
    {(mode === "translate" || mode === "rotate") && <TransformControls object={anchor} mode={mode} space="world" size={0.85}
      translationSnap={snap ? .01 : null} rotationSnap={snap ? Math.PI / 36 : null}
      onMouseDown={onBeginChange} onObjectChange={update} />}
    <OrbitControls makeDefault enablePan={false} />
  </>;
}
function BraceletPreview({ model, captureRef, onReady, onError }: Props) {
  useGLTF(model.url, false, false);
  const bead = useRef<Group>(null!);
  const guides = useRef<Group>(null!);
  const { gl, scene, camera, invalidate } = useThree();
  const radius = Math.max(model.widthMm / 10, 1);
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      const cam = camera as PerspectiveCamera;
      const position = cam.position.clone(), rotation = cam.quaternion.clone();
      const aspect = cam.aspect;
      guides.current.visible = false;
      try {
        bead.current.updateWorldMatrix(true, true);
        const box = new Box3().setFromObject(bead.current);
        const center = box.getCenter(new Vector3());
        const distance = Math.max(box.getSize(new Vector3()).length(), .1) / (2 * Math.tan(cam.fov * Math.PI / 360)) * 1.25;
        cam.position.copy(center).add(new Vector3(0.5, 0.8, 1).normalize().multiplyScalar(distance));
        cam.lookAt(center); cam.aspect = 1; cam.updateProjectionMatrix();
        gl.render(scene, cam);
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Không tạo được ảnh xem trước.");
        context.drawImage(gl.domElement, 0, 0, 256, 256);
        return canvas.toDataURL("image/webp", .85);
      } finally {
        guides.current.visible = true; cam.position.copy(position); cam.quaternion.copy(rotation); cam.aspect = aspect; cam.updateProjectionMatrix(); invalidate();
      }
    };
    return () => { captureRef.current = null; };
  }, [captureRef, gl, scene, camera, invalidate, model]);
  return <>
    <Bounds key={[model.widthMm, ...model.holeCenter, ...(model.anchorRotation ?? []), model.attachment, model.rollDegrees].join(":")} fit clip observe margin={1.8}><group ref={bead}><GlbBead model={model} onReady={onReady} onError={onError} /></group></Bounds>
    <group ref={guides} position={[0, 0, radius * 1.8]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius * 1.8, .018, 8, 96]} /><meshStandardMaterial color="#94a3b8" /></mesh>
      {[0, .6, 1.2, 1.8, 2.4, 3, 3.6, 4.2, 4.8, 5.4].map(angle => <mesh key={angle} position={[Math.cos(angle) * radius * 1.8, 0, Math.sin(angle) * radius * 1.8]}><sphereGeometry args={[.12, 12, 12]} /><meshStandardMaterial color="#e2e8f0" /></mesh>)}
    </group>
    <OrbitControls makeDefault enablePan={false} />
  </>;
}
export default function ModelPreview(props: Props) {
  const [mode, setMode] = useState<"view" | "translate" | "rotate" | "pick">("translate");
  const [view, setView] = useState("perspective");
  const [transparent, setTransparent] = useState(false);
  const [snap, setSnap] = useState(false);
  const radius = Math.max(props.model.widthMm / 10, 1);
  return <div className="space-y-3">
    {props.onChange && <>
      <div className="flex flex-wrap gap-2">{([["view", "Xem model"], ["translate", "Di chuyển lỗ"], ["rotate", "Xoay hướng lỗ"], ["pick", "Chọn trên bề mặt"]] as const).map(([value, label]) => <button type="button" aria-pressed={mode === value} key={value} onClick={() => setMode(value)} className={`rounded-lg border px-3 py-2 text-xs ${mode === value ? "bg-rose-600 text-white" : "bg-white"}`}>{label}</button>)}</div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label>Góc nhìn <select value={view} onChange={e => setView(e.target.value)} className="rounded border p-1"><option value="perspective">Phối cảnh</option><option value="front">Trước</option><option value="side">Bên</option><option value="top">Trên</option></select></label>
        <label><input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} /> Trong suốt</label>
        <label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Căn bước 0,1 mm / 5°</label>
      </div>
      <p className="text-xs text-gray-600">Kéo mũi tên hoặc ô vuông để đặt tâm; kéo vòng màu để xoay hướng. Đường đỏ là trục dây. Đây là điểm gắn, không đục lỗ trên model.</p>
      <PreviewBoundary key={props.model.url} onError={props.onError}><div className="h-80 overflow-hidden rounded-xl bg-slate-100 touch-none" aria-label="Chỉnh điểm gắn 3D">
        <Canvas camera={{ position: [3, 3, 3], fov: 38 }} dpr={[1, 1.5]} frameloop="demand">
          <color attach="background" args={["#edf0f4"]} /><Lighting />
          <Suspense fallback={null}><AnchorEditor {...props} mode={mode} transparent={transparent} snap={snap} view={view} /></Suspense>
        </Canvas>
      </div></PreviewBoundary>
    </>}
    <p className="text-sm font-medium">Xem thử trên vòng — cùng hướng và kích thước khi khách thiết kế</p>
    <PreviewBoundary key={`ring-${props.model.url}`} onError={props.onError}><div className="h-72 overflow-hidden rounded-xl bg-slate-100" aria-label="Xem trước model trên vòng">
      <Canvas camera={{ position: [radius * 2.5, radius * 3, radius * 4], fov: 38 }} dpr={[1, 1.5]} frameloop="demand">
        <color attach="background" args={["#edf0f4"]} /><Lighting /><Suspense fallback={null}><BraceletPreview {...props} /></Suspense>
      </Canvas>
    </div></PreviewBoundary>
  </div>;
}
