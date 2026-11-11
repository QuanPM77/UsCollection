"use client";

import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import type { BeadModel } from "@/lib/bead-model";
import { modelTransform } from "@/lib/model-transform";

class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function LoadedModel({ model, angle, onReady }: { model: BeadModel; angle: number; onReady?: () => void }) {
  const { scene } = useGLTF(model.url, false, false);
  // Independent scene graph for each bead; geometry/material resources stay shared.
  const clone = useMemo(() => scene.clone(true), [scene]);
  const transform = useMemo(() => modelTransform(scene, model, angle), [scene, model, angle]);
  useEffect(() => { onReady?.(); }, [onReady, scene]);
  return <group quaternion={transform.rotation}><group position={transform.offset}>
    <primitive object={clone} scale={transform.scale} dispose={null} />
  </group></group>;
}
export default function GlbBead({ model, angle = -Math.PI / 2, fallback = null, onReady, onError }: { model: BeadModel; angle?: number; fallback?: ReactNode; onReady?: () => void; onError?: () => void }) {
  return <ModelBoundary key={model.url} fallback={fallback} onError={onError}><Suspense fallback={fallback}>
    <LoadedModel model={model} angle={angle} onReady={onReady} />
  </Suspense></ModelBoundary>;
}
