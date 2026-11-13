"use client";

import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { Box3, Vector3 } from "three";
import type { Object3D, Quaternion } from "three";
import { useGLTF } from "@react-three/drei";
import type { BeadModel } from "@/lib/bead-model";
import { modelTransform } from "@/lib/model-transform";

class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
const PENDANT_CHAIN_URL = "/models/charms/day-xich-3-khoen.glb";
const PENDANT_CHAIN_WIDTH = 0.17;
const CHAIN_CORD_OVERLAP = -0.06;
export const PENDANT_CHAIN_DROP_DISTANCE = 0.38 * (PENDANT_CHAIN_WIDTH / 0.2);
export const PENDANT_CHAIN_ATTACHMENT_Y = -PENDANT_CHAIN_DROP_DISTANCE + CHAIN_CORD_OVERLAP;
class ChainBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function chainFit(scene: Object3D) {
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  const firstLink = scene.getObjectByName("khoen_0");
  const lastLink = scene.getObjectByName("khoen_2");
  const firstBox = firstLink ? new Box3().setFromObject(firstLink) : box;
  const lastBox = lastLink ? new Box3().setFromObject(lastLink) : box;
  const firstCenterY = (firstBox.min.y + firstBox.max.y) / 2;
  const lastCenterY = (lastBox.min.y + lastBox.max.y) / 2;
  const scale = PENDANT_CHAIN_WIDTH / Math.max(size.x, size.z);
  return { scale, center: box.getCenter(new Vector3()), firstCenterY, dropDistance: Math.max(0, (firstCenterY - lastCenterY) * scale) };
}
function ChainMesh({ scene, angle, fit }: { scene: Object3D; angle: number; fit: ReturnType<typeof chainFit> }) {
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <group rotation={[0, Math.PI / 2 - angle, 0]}>
    <primitive object={clone} position={[-fit.center.x * fit.scale, -fit.firstCenterY * fit.scale + CHAIN_CORD_OVERLAP, -fit.center.z * fit.scale]} scale={fit.scale} dispose={null} />
  </group>;
}
export function PendantChain({ angle }: { angle: number }) {
  const { scene } = useGLTF(PENDANT_CHAIN_URL);
  const fit = useMemo(() => chainFit(scene), [scene]);
  return <ChainMesh scene={scene} angle={angle} fit={fit} />;
}
export function SafePendantChain({ angle }: { angle: number }) {
  return <ChainBoundary fallback={null}><Suspense fallback={null}><PendantChain angle={angle} /></Suspense></ChainBoundary>;
}
function PendantCharm({ clone, angle, rotation, offset, scale }: { clone: Object3D; angle: number; rotation: Quaternion; offset: Vector3; scale: number }) {
  const { scene: chainScene } = useGLTF(PENDANT_CHAIN_URL);
  const fit = useMemo(() => chainFit(chainScene), [chainScene]);
  return <>
    <ChainMesh scene={chainScene} angle={angle} fit={fit} />
    <group position={[0, -fit.dropDistance + CHAIN_CORD_OVERLAP, 0]} quaternion={rotation}>
      <group position={offset}><primitive object={clone} scale={scale} dispose={null} /></group>
    </group>
  </>;
}
function LoadedModel({ model, angle, onReady }: { model: BeadModel; angle: number; onReady?: () => void }) {
  const { scene } = useGLTF(model.url, false, false);
  // Independent scene graph for each bead; geometry/material resources stay shared.
  const clone = useMemo(() => scene.clone(true), [scene]);
  const transform = useMemo(() => modelTransform(scene, model, angle), [scene, model, angle]);
  useEffect(() => { onReady?.(); }, [onReady, scene]);
  const isPendant = model.attachment === "pendant";
  return <>
    {isPendant
      ? <PendantCharm clone={clone} angle={angle} rotation={transform.rotation} offset={transform.offset} scale={transform.scale} />
      : <group quaternion={transform.rotation}><group position={transform.offset}><primitive object={clone} scale={transform.scale} dispose={null} /></group></group>}
  </>;
}
export default function GlbBead({ model, angle = -Math.PI / 2, fallback = null, onReady, onError }: { model: BeadModel; angle?: number; fallback?: ReactNode; onReady?: () => void; onError?: () => void }) {
  return <ModelBoundary key={model.url} fallback={fallback} onError={onError}><Suspense fallback={fallback}>
    <LoadedModel model={model} angle={angle} onReady={onReady} />
  </Suspense></ModelBoundary>;
}
