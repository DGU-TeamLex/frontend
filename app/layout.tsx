import type { Metadata } from "next";
import { Gowun_Batang, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";
import { AuthProvider } from "./lib/auth-context";

// 본문/UI: IBM Plex Sans KR (또렷한 기하학적 산세리프, 실제 굵기 5단계 지원)
// 제목: Gowun Batang (한국어 전용으로 설계된 세리프, Georgia 대체)
const plexSans = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const gowunBatang = Gowun_Batang({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
});

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
    <html lang="ko" className={`${plexSans.variable} ${gowunBatang.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <AuthProvider>
          <Nav />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
          <footer className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-6 pb-10 pt-5 text-xs text-ink-faint">
            <span>WeP-Stock 데모 · 명세서 v0.1 기반 · 데이터는 시연용 시드값입니다.</span>
            <a
              href={`${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/v1\/?$/, "")}/docs`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink-muted underline-offset-2 hover:text-accent hover:underline"
            >
              API 문서(Swagger) →
            </a>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
