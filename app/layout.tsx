import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";

export const metadata: Metadata = {
  title: "WeP-Stock — 의료물품 통합 재고관리",
  description: "전국 보건기관 의료물품 통합 재고 관리 웹서비스 (데모)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Nav />
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-6 pb-10 pt-4 text-xs text-slate-400">
          WeP-Stock 데모 · 명세서 v0.1 기반 · 데이터는 시연용 시드값입니다.
        </footer>
      </body>
    </html>
  );
}
