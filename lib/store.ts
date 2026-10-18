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

export type CanvasTheme = "pink" | "white" | "dark";

interface BraceletStore {
  // Config
  wristCircumference: number; // mm
  slots: BraceletSlot[];
  beadCatalog: BeadType[];
  selectedBeadType: BeadType | null;
  hoveredSlotIndex: number | null;

  // UI
  isAutoRotating: boolean;
  canvasTheme: CanvasTheme;

  // Actions
  setWristCircumference: (mm: number) => void;
  setSelectedBeadType: (bead: BeadType | null) => void;
  setBeadCatalog: (beads: BeadType[]) => void;
  setHoveredSlot: (index: number | null) => void;
  setCanvasTheme: (theme: CanvasTheme) => void;
  addBead: (beadTypeId: string) => void;
  removeBead: (index: number) => void;
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

export const useBraceletStore = create<BraceletStore>()(
  persist(
    (set, get) => ({
      wristCircumference: DEFAULT_CIRCUMFERENCE,
      slots: [], // Empty cord by default
      beadCatalog: [],
      selectedBeadType: null,
      hoveredSlotIndex: null,
      isAutoRotating: false,
      canvasTheme: "pink",

      setCanvasTheme: (theme) => set({ canvasTheme: theme }),



      setWristCircumference: (mm) => {
        const clampedMm = Math.min(Math.max(mm, 100), 250);
        const { slots } = get();

        // Keep current beads but automatically trim any that exceed the new circumference + 2mm
        let currentTotal = 0;
        const newSlots = [];
        for (const slot of slots) {
          const bead = get().beadCatalog.find((b) => b.id === slot.beadTypeId);
          const diameter = bead?.diameter ?? 8;
          if (currentTotal + diameter <= clampedMm + 2) {
            newSlots.push(slot);
            currentTotal += diameter;
          } else {
            break; // Drop remaining beads that don't fit
          }
        }

        const reindexedSlots = newSlots.map((s, idx) => ({ ...s, index: idx }));

        set({
          wristCircumference: clampedMm,
          slots: reindexedSlots,
        });
      },

      setSelectedBeadType: (bead) => set({ selectedBeadType: bead }),

      setBeadCatalog: (beadCatalog) => {
        const activeIds = new Set(beadCatalog.map((bead) => bead.id));
        const { selectedBeadType } = get();
        set({
          beadCatalog,
          selectedBeadType: selectedBeadType && activeIds.has(selectedBeadType.id) && beadCatalog.find((bead) => bead.id === selectedBeadType.id)?.is_active !== false
            ? beadCatalog.find((bead) => bead.id === selectedBeadType.id) ?? null
            : null,
        });
      },

      setHoveredSlot: (index) => set({ hoveredSlotIndex: index }),

      addBead: (beadTypeId) => {
        const { slots, wristCircumference, beadCatalog } = get();
        const bead = beadCatalog.find((b) => b.id === beadTypeId && b.is_active !== false);
        if (!bead) return;
        const alreadyPlaced = slots.filter((slot) => slot.beadTypeId === beadTypeId).length;
        if (bead.stock !== undefined && alreadyPlaced >= bead.stock) return;

        // Calculate current total diameter
        const currentTotal = slots.reduce((sum, s) => {
          const b = beadCatalog.find((x) => x.id === s.beadTypeId);
          return sum + (b?.diameter ?? 8);
        }, 0);

        // Limit size to target + 2mm buffer (strictly prevent exceeding)
        if (currentTotal + bead.diameter > wristCircumference + 2) {
          console.warn(`Vòng tay đã đầy hạt cho kích thước cổ tay ${wristCircumference}mm`);
          return;
        }

        const newSlots = [
          ...slots,
          { index: slots.length, beadTypeId },
        ];
        set({ slots: newSlots });
      },

      removeBead: (index) => {
        const { slots } = get();
        const newSlots = slots
          .filter((_, idx) => idx !== index)
          .map((s, idx) => ({ ...s, index: idx }));
        set({ slots: newSlots });
      },

      fillSlot: (index) => {
        const { selectedBeadType, slots, wristCircumference } = get();
        if (!selectedBeadType) return;
        const currentUses = slots.filter((slot) => slot.beadTypeId === selectedBeadType.id).length;
        const replacedId = slots[index]?.beadTypeId;
        const usesAfterReplace = currentUses - (replacedId === selectedBeadType.id ? 1 : 0) + (replacedId === selectedBeadType.id ? 0 : 1);
        if (selectedBeadType.stock !== undefined && usesAfterReplace > selectedBeadType.stock) return;

        // Check if replacing this bead would exceed the limit
        const currentTotal = slots.reduce((sum, s) => {
          const b = get().beadCatalog.find((x) => x.id === s.beadTypeId);
          return sum + (b?.diameter ?? 8);
        }, 0);

        const oldBead = get().beadCatalog.find((b) => b.id === slots[index]?.beadTypeId);
        const oldDiameter = oldBead?.diameter ?? 8;
        const newDiameter = selectedBeadType.diameter;

        if (currentTotal - oldDiameter + newDiameter > wristCircumference + 2) {
          console.warn(`Thay thế hạt này làm vòng tay vượt quá giới hạn độ dài cho cổ tay ${wristCircumference}mm`);
          return;
        }


        const newSlots = slots.map((s) =>
          s.index === index ? { ...s, beadTypeId: selectedBeadType.id } : s
        );
        set({ slots: newSlots });
      },

      clearSlot: (index) => {
        // Clearing a slot in the dynamic model removes it
        get().removeBead(index);
      },

      clearAll: () => {
        set({ slots: [] });
      },

      fillAll: () => {
        const { selectedBeadType, wristCircumference } = get();
        if (!selectedBeadType) return;
        
        const beadDiameter = selectedBeadType.diameter ?? 8;
        const count = Math.min(Math.round(wristCircumference / beadDiameter), selectedBeadType.stock ?? Number.MAX_SAFE_INTEGER);
        if (count < 1) return;
        const newSlots = Array.from({ length: count }, (_, i) => ({
          index: i,
          beadTypeId: selectedBeadType.id,
        }));
        
        set({ slots: newSlots });
      },

      toggleAutoRotate: () =>
        set((state) => ({ isAutoRotating: !state.isAutoRotating })),

      totalPrice: () => calculateTotalPrice(get().slots, get().beadCatalog),

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
