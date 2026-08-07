import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";
import { AuthProvider } from "./lib/auth-context";

// 서체는 한 가족으로 통일한다. 제목용 세리프(구 Gowun Batang)를 별도로 쓰면
// 업무 화면이 읽을거리처럼 보인다. 위계는 크기·굵기로만 만든다.
const plexSans = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// 수치 전용. 표에서 자릿수가 어긋나면 비교가 안 된다.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
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
    <html lang="ko" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-[15px] text-ink antialiased">
        <AuthProvider>
          <Nav />
          <main className="mx-auto max-w-[1400px] px-5 py-6">{children}</main>
          <footer className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-5 pb-8 pt-4 text-xs text-ink-faint">
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
