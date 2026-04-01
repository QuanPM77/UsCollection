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
 * Generate 3D positions for N beads arranged in a circle of radius R.
 * Positions are in the XZ plane; Y is used for slight vertical offset (rope).
 */
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
