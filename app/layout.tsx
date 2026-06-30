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
        <footer className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-6 pb-10 pt-4 text-xs text-slate-400">
          <span>WeP-Stock 데모 · 명세서 v0.1 기반 · 데이터는 시연용 시드값입니다.</span>
          <a
            href={`${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/v1\/?$/, "")}/docs`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
          >
            API 문서(Swagger) →
          </a>
        </footer>
      </body>
    </html>
  );
}
