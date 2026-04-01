/**
 * Global State — Zustand store
 * Manages bracelet configuration, selected bead, and UI state.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BraceletSlot, BeadType } from "@/types";
import {
  calculateBeadCount,
  calculateTotalPrice,
} from "@/lib/braceletMath";
import { BEAD_CATALOG } from "@/lib/beadData";

interface BraceletStore {
  // Config
  wristCircumference: number; // mm
  slots: BraceletSlot[];
  selectedBeadType: BeadType | null;
  hoveredSlotIndex: number | null;

  // UI
  isAutoRotating: boolean;

  // Actions
  setWristCircumference: (mm: number) => void;
  setSelectedBeadType: (bead: BeadType | null) => void;
  setHoveredSlot: (index: number | null) => void;
  fillSlot: (index: number) => void;
  clearSlot: (index: number) => void;
  clearAll: () => void;
  fillAll: () => void;
  toggleAutoRotate: () => void;

  // Computed
  totalPrice: () => number;
  filledCount: () => number;
}

const DEFAULT_CIRCUMFERENCE = 160; // 160mm — average adult wrist

const buildEmptySlots = (circumference: number): BraceletSlot[] => {
  const count = calculateBeadCount(circumference);
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    beadTypeId: null,
  }));
};

export const useBraceletStore = create<BraceletStore>()(
  persist(
    (set, get) => ({
      wristCircumference: DEFAULT_CIRCUMFERENCE,
      slots: buildEmptySlots(DEFAULT_CIRCUMFERENCE),
      selectedBeadType: null,
      hoveredSlotIndex: null,
      isAutoRotating: true,

      setWristCircumference: (mm) => {
        const clampedMm = Math.min(Math.max(mm, 100), 250);
        set({
          wristCircumference: clampedMm,
          slots: buildEmptySlots(clampedMm),
        });
      },

      setSelectedBeadType: (bead) => set({ selectedBeadType: bead }),

      setHoveredSlot: (index) => set({ hoveredSlotIndex: index }),

      fillSlot: (index) => {
        const { selectedBeadType, slots } = get();
        if (!selectedBeadType) return;
        const newSlots = slots.map((s) =>
          s.index === index ? { ...s, beadTypeId: selectedBeadType.id } : s
        );
        set({ slots: newSlots });
      },

      clearSlot: (index) => {
        const newSlots = get().slots.map((s) =>
          s.index === index ? { ...s, beadTypeId: null } : s
        );
        set({ slots: newSlots });
      },

      clearAll: () => {
        const newSlots = get().slots.map((s) => ({ ...s, beadTypeId: null }));
        set({ slots: newSlots });
      },

      fillAll: () => {
        const { selectedBeadType, slots } = get();
        if (!selectedBeadType) return;
        const newSlots = slots.map((s) => ({
          ...s,
          beadTypeId: selectedBeadType.id,
        }));
        set({ slots: newSlots });
      },

      toggleAutoRotate: () =>
        set((state) => ({ isAutoRotating: !state.isAutoRotating })),

      totalPrice: () => calculateTotalPrice(get().slots, BEAD_CATALOG),

      filledCount: () =>
        get().slots.filter((s) => s.beadTypeId !== null).length,
    }),
    {
      name: "bead-bracelet-draft", // localStorage key
      partialize: (state) => ({
        wristCircumference: state.wristCircumference,
        slots: state.slots,
      }),
    }
  )
);
