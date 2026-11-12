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
  return fittedRadiusMm(diametersMm, defaultCircumferenceMm) / 10;
};

function fittedRadiusMm(diametersMm: number[], circumferenceMm: number) {
  let radius = circumferenceMm / (2 * Math.PI);
  if (diametersMm.length < 2) return radius;
  const requiredAngle = (candidate: number) => diametersMm.reduce((sum, current, i) => {
    const next = diametersMm[(i + 1) % diametersMm.length];
    return sum + 2 * Math.asin(Math.min((current + next) / (4 * candidate), 0.999999));
  }, 0);
  if (requiredAngle(radius) <= Math.PI * 2) return radius;

  // Keep every bead's minimum chord spacing. If a nearly full bracelet needs
  // a little more room because of curvature, expand the ring instead of
  // shrinking bead gaps until neighboring meshes overlap.
  let low = radius;
  let high = radius * 2;
  while (requiredAngle(high) > Math.PI * 2) high *= 2;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (requiredAngle(mid) > Math.PI * 2) low = mid;
    else high = mid;
  }
  return high;
}

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
  targetCircumferenceMm = 160,
  spreadSlack = false
): BeadPosition[] => {
  const count = diametersMm.length;
  if (count === 0) return [];

  const radiusMm = fittedRadiusMm(diametersMm, targetCircumferenceMm);
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

  // Keep unused cord as one open section by default. The editor can opt in to
  // spreading that slack evenly when the customer asks to fill the bracelet.
  const gapAngle = spreadSlack ? Math.max(0, (Math.PI * 2 - totalAngleNeeded) / count) : 0;

  const positions: BeadPosition[] = [];
  let currentAngle = -Math.PI / 2;

  for (let i = 0; i < count; i++) {
    positions.push({
      x: Math.cos(currentAngle) * radius,
      y: 0,
      z: Math.sin(currentAngle) * radius,
      angle: currentAngle,
    });

    currentAngle += angleIncrements[i] + gapAngle;
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
