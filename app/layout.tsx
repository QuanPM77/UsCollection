import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { getSession } from "@/lib/auth-session";
import { LoginPromptProvider } from "@/components/LoginPromptProvider";
import CustomerChatVisibility from "@/components/support/CustomerChatVisibility";
import IdleModulePreloader from "@/components/IdleModulePreloader";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], display: "swap", variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin", "vietnamese"], display: "swap", variable: "--font-playfair" });

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
  const session = await getSession();
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body>
        <LoginPromptProvider isAuthenticated={Boolean(session?.user)}>{children}</LoginPromptProvider>
        <IdleModulePreloader />
        {session?.user?.role === "customer" && <CustomerChatVisibility />}
      </body>
    </html>
  );
}
