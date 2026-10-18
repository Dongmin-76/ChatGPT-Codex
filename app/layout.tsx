import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Policy Canvas · 달라지는 대한민국",
  description: "과학기술정보통신부 업무계획 PDF 전체를 분석하고, 달라지는 대한민국을 A4 인포그래픽 한 장으로 만듭니다.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
