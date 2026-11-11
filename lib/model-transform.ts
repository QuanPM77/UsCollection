import { Box3, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { ModelSettings } from "@/lib/bead-model";

// Source +axis becomes the string tangent. Face (+Z for X/Y bores, +Y for Z
// bores) faces upward on the flat bracelet. Offset is measured from mesh centre.
export function modelTransform(scene: Object3D, settings: ModelSettings, angle = -Math.PI / 2) {
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3()); const center = box.getCenter(new Vector3());
  if (!Number.isFinite(size.x) || size.x < 1e-8) throw new Error("Mô hình không có kích thước hợp lệ.");
  const scale = settings.widthMm / 10 / size.x;
  const source = settings.holeAxis === "x" ? new Vector3(1, 0, 0) : settings.holeAxis === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
  const front = settings.holeAxis === "z" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
  const sourceBasis = new Matrix4().makeBasis(source, new Vector3().crossVectors(front, source), front);
  const tangent = new Vector3(-Math.sin(angle), 0, Math.cos(angle));
  const up = new Vector3(0, 1, 0);
  const targetBasis = new Matrix4().makeBasis(tangent, new Vector3().crossVectors(up, tangent), up);
  const rotation = new Quaternion().setFromRotationMatrix(targetBasis.multiply(sourceBasis.transpose()));
  rotation.premultiply(new Quaternion().setFromAxisAngle(tangent, settings.rollDegrees * Math.PI / 180));
  const offset = new Vector3(...settings.holeCenter).divideScalar(10).add(center.multiplyScalar(scale)).negate();
  return { scale, rotation, offset };
}
