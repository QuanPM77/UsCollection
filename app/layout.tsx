import type { Metadata } from "next";
import { auth } from "@/auth";
import { LoginPromptProvider } from "@/components/LoginPromptProvider";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="vi">
      <body><LoginPromptProvider isAuthenticated={Boolean(session?.user)}>{children}</LoginPromptProvider></body>
    </html>
  );
}
