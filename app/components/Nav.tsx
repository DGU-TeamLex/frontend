"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, roleHome } from "../lib/auth-context";

// 리디자인 2차: 핵심 3가지(부족 예상·재고량 예상·발주량 예측)를 전면에 두고 메뉴를 3개로 축소.
// 공급위험(/supply-risk)은 MOCK이라 예측 화면 안 카드로 강등(라우트는 유지), 기관탐색·표준품목검색은
// 재고·발주 표의 컬럼 필터로 흡수됨.
const CENTRAL_LINKS = [
  { href: "/", label: "예측" },
  { href: "/inventory", label: "재고·발주" },
  { href: "/data", label: "데이터" },
];

const INSTITUTION_LINKS = [
  { href: "/my", label: "내 기관 재고" },
  { href: "/alerts", label: "알림" },
];

function AuthStatus() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="h-8 w-20 animate-pulse rounded-md bg-line/50" />;
  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        로그인
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {user.role === "CENTRAL" && (
        <Link
          href="/admin"
          className="hidden rounded-md px-3 py-1.5 font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink sm:block"
        >
          관리자
        </Link>
      )}
      <span className="hidden items-center gap-1.5 rounded-full bg-paper py-1 pl-1 pr-3 md:flex">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-dark">
          {user.name?.[0] ?? "·"}
        </span>
        <span className="text-xs font-medium text-ink-muted">{user.name}</span>
        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          {user.role === "CENTRAL" ? "중앙" : "기관"}
        </span>
      </span>
      <button
        onClick={logout}
        className="rounded-md px-3 py-1.5 font-medium text-ink-muted transition-colors hover:bg-surface hover:text-crit"
      >
        로그아웃
      </button>
    </div>
  );
}

export default function Nav() {
  const path = usePathname();
  const { user } = useAuth();
  const links = !user ? [] : user.role === "CENTRAL" ? CENTRAL_LINKS : INSTITUTION_LINKS;
  const brandHref = user ? roleHome(user.role) : "/";
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-x-6 px-6 py-3">
        <Link href={brandHref} className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-[13px] font-bold text-white shadow-card">
            WS
          </span>
          <span className="font-serif text-[16px] font-bold leading-none tracking-tight text-ink">
            WeP<span className="text-accent">·</span>Stock
          </span>
        </Link>

        {links.length > 0 && (
          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active ? "text-accent-dark" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-3 h-0.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto">
          <AuthStatus />
        </div>
      </div>

      {/* 모바일 하단 탭 */}
      {links.length > 0 && (
        <nav className="flex items-center gap-0.5 overflow-x-auto border-t border-line px-4 py-1.5 md:hidden">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-accent text-white" : "text-ink-muted"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
