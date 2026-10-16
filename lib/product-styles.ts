export const PRODUCT_STYLES = [
  { key: "y2k-fairycore", label: "Y2K / Fairycore", description: "Nhiều màu, charm bướm, mặt trăng, mèo và chi tiết mộng mơ." },
  { key: "vintage-boho", label: "Vintage / Boho", description: "Hạt gỗ, đá tự nhiên, dây da và phong cách tự do." },
  { key: "gothic-dark", label: "Gothic / Dark", description: "Tone tối, dây xích, charm cá tính và bí ẩn." },
  { key: "minimalism", label: "Tối giản", description: "Thiết kế thanh lịch, gọn nhẹ, dễ đeo hằng ngày." },
  { key: "feng-shui", label: "Phong thủy", description: "Đá, gỗ và charm mang ý nghĩa may mắn, bình an." },
  { key: "pandora-charm", label: "Charm Pandora", description: "Dây xích phối charm theo sở thích." },
  { key: "classic-luxury", label: "Cổ điển / Sang trọng", description: "Ngọc trai, vàng hoặc đá quý cho dịp đặc biệt." },
] as const;

export type ProductStyleKey = (typeof PRODUCT_STYLES)[number]["key"];

export function productStyleLabel(key: string) {
  return PRODUCT_STYLES.find((style) => style.key === key)?.label ?? key;
}
