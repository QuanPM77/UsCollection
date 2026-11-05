import type { BeadType } from "@/types";

let pending: Promise<BeadType[]> | undefined;

// Share simultaneous requests only; future visits still fetch current data.
export function fetchBeadCatalog() {
  if (!pending) {
    pending = fetch("/api/bead-types", { cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.data)) throw new Error("Không tải được danh sách hạt");
        return result.data as BeadType[];
      }).finally(() => { pending = undefined; });
  }
  return pending;
}
