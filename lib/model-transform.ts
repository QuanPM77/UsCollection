import { Box3, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { ModelSettings } from "@/lib/bead-model";

export function anchorQuaternion(settings: ModelSettings) {
  if (settings.anchorRotation) return new Quaternion(...settings.anchorRotation).normalize();
  const axis = settings.holeAxis === "x" ? new Vector3(1, 0, 0) : settings.holeAxis === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
  const front = settings.holeAxis === "z" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(axis, new Vector3().crossVectors(front, axis), front));
}

export function modelDimensions(scene: Object3D, widthMm: number) {
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  if (!Number.isFinite(size.x) || size.x < 1e-8) throw new Error("Mô hình không có chiều rộng hợp lệ.");
  return { scale: widthMm / 10 / size.x, center: box.getCenter(new Vector3()), size };
}

// The anchor is expressed relative to the model's bounding-box centre, in mm.
export function modelTransform(scene: Object3D, settings: ModelSettings, angle = -Math.PI / 2) {
  const { scale, center } = modelDimensions(scene, settings.widthMm);
  const tangent = new Vector3(-Math.sin(angle), 0, Math.cos(angle));
  // A cord has no forward direction. Reverse its frame for pendants so local
  // +Y stays up while +Z faces outward; otherwise the charm hangs upside down.
  if (settings.attachment === "pendant") tangent.negate();
  const front = settings.attachment === "pendant" ? new Vector3(Math.cos(angle), 0, Math.sin(angle)) : new Vector3(0, 1, 0);
  const target = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(tangent, new Vector3().crossVectors(front, tangent), front));
  const rotation = target.multiply(anchorQuaternion(settings).invert());
  rotation.premultiply(new Quaternion().setFromAxisAngle(tangent, settings.rollDegrees * Math.PI / 180));
  const offset = new Vector3(...settings.holeCenter).divideScalar(10).add(center.multiplyScalar(scale)).negate();
  return { scale, rotation, offset };
}
