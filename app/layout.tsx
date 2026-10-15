import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UsStory — Vòng tay thủ công 3D",
  description:
    "Thiết kế vòng tay hạt cá nhân hóa trong 3D. Chọn từng hạt, xem ngay, đặt hàng qua PayOS.",
  keywords: ["vòng tay", "hạt", "thủ công", "3D", "rose quartz"],
  openGraph: {
    title: "UsStory",
    description: "Vòng tay hạt thủ công — Thiết kế 3D",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
