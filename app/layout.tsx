import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamLex Frontend",
  description: "TeamLex FE — 자동 생성 기능 데모",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
