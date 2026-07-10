"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth-context";

const LINKS = [
  { href: "/", label: "지역·기관 탐색" },
  { href: "/central", label: "중앙 대시보드" },
  { href: "/supply-risk", label: "공급위험 경보" },
  { href: "/inventory", label: "적정재고·발주" },
  { href: "/alerts", label: "알림" },
  { href: "/imports", label: "데이터 인테이크" },
];

function AuthStatus() {
  const { user, loading, logout } = useAuth();
  if (loading) return null;
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
    <div className="flex items-center gap-2 text-sm">
      {user.role === "CENTRAL" && (
        <Link
          href="/admin"
          className="rounded-md px-3 py-1.5 font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          관리자
        </Link>
      )}
      <span className="hidden text-ink-faint sm:inline">{user.name}</span>
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
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-xs font-bold text-white">
            WS
          </span>
          <span className="font-serif text-[15px] font-bold tracking-tight text-ink">
            WeP-Stock
            <span className="ml-2.5 hidden font-sans text-xs font-normal text-ink-faint sm:inline">
              전국 보건기관 의료물품 통합 재고관리
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
