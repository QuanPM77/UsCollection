/**
 * Bracelet Math Utilities
 *
 * Vector math to position beads on a circle of radius R = Circumference / (2π)
 * Beads are arranged in the XZ plane (Y = 0) so the bracelet lies flat,
 * and we can tilt it with OrbitControls in the 3D scene.
 */

export interface BeadPosition {
  x: number;
  y: number;
  z: number;
  angle: number; // radians
}

/**
 * Calculate radius from wrist circumference (in mm).
 * We scale down by 10 to get Three.js units (1 unit ≈ 10mm).
 */
export const circumferenceToRadius = (circumferenceMm: number): number => {
  return circumferenceMm / (2 * Math.PI * 10);
};

/**
 * Calculate radius from actual beads diameters on the bracelet.
 * Always returns radius based on target wrist circumference to prevent dynamic expanding.
 */
export const calculateRadiusFromBeads = (
  diametersMm: number[],
  defaultCircumferenceMm = 160
): number => {
  return defaultCircumferenceMm / (2 * Math.PI * 10);
};

/**
 * Calculate how many beads fit on a bracelet given:
 * - circumference in mm
 * - bead diameter in mm (default 8mm)
 */
export const calculateBeadCount = (
  circumferenceMm: number,
  beadDiameterMm = 8
): number => {
  const count = Math.floor(circumferenceMm / beadDiameterMm);
  return Math.max(count, 6); // minimum 6 beads
};

/**
 * Generate 3D positions for variable-sized beads arranged tightly in a circle of FIXED radius.
 */
export const generateVariableBeadPositions = (
  diametersMm: number[],
  targetCircumferenceMm = 160
): BeadPosition[] => {
  const count = diametersMm.length;
  if (count === 0) return [];

  const radiusMm = targetCircumferenceMm / (2 * Math.PI);
  const radius = radiusMm / 10; // Three.js units

  // 1. Calculate required angular steps using exact 3D sphere chord distance
  // 2 * R * sin(delta_theta / 2) = (d_current + d_next) / 2
  const angleIncrements: number[] = [];
  let totalAngleNeeded = 0;

  for (let i = 0; i < count; i++) {
    const nextIndex = (i + 1) % count;
    const dCurrent = diametersMm[i];
    const dNext = diametersMm[nextIndex];
    const ratio = Math.min((dCurrent + dNext) / (4 * radiusMm), 0.999);
    const inc = 2 * Math.asin(ratio);
    angleIncrements.push(inc);
    totalAngleNeeded += inc;
  }

  // 2. If the beads fill or nearly fill the circle (totalAngleNeeded >= 1.8 * PI),
  // scale increments uniformly so they form a beautiful closed loop without gaps or overlapping.
  const scale = totalAngleNeeded > Math.PI * 1.8 ? (Math.PI * 2) / totalAngleNeeded : 1.0;

  const positions: BeadPosition[] = [];
  let currentAngle = -Math.PI / 2;

  for (let i = 0; i < count; i++) {
    positions.push({
      x: Math.cos(currentAngle) * radius,
      y: 0,
      z: Math.sin(currentAngle) * radius,
      angle: currentAngle,
    });

    currentAngle += angleIncrements[i] * scale;
  }

  return positions;
};


export const generateBeadPositions = (
  beadCount: number,
  radius: number
): BeadPosition[] => {
  const positions: BeadPosition[] = [];

  for (let i = 0; i < beadCount; i++) {
    const angle = (i / beadCount) * Math.PI * 2 - Math.PI / 2;
    positions.push({
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
      angle,
    });
  }

  return positions;
};

/**
 * Generate torus tube path points for the elastic cord.
 * Returns an array of Vector3-like points forming a smooth circle.
 */
export const generateCordPoints = (
  radius: number,
  segments = 64
): [number, number, number][] => {
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
    points.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
  }
  return points;
};

/**
 * Calculate total price of the bracelet configuration.
 */
export const calculateTotalPrice = (
  slots: Array<{ beadTypeId: string | null }>,
  catalog: Array<{ id: string; price: number }>
): number => {
  return slots.reduce((total, slot) => {
    if (!slot.beadTypeId) return total;
    const bead = catalog.find((b) => b.id === slot.beadTypeId);
    return total + (bead?.price ?? 0);
  }, 0);
};
