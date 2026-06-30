"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "지역·기관 탐색" },
  { href: "/central", label: "중앙 대시보드" },
  { href: "/supply-risk", label: "공급위험 경보" },
  { href: "/inventory", label: "적정재고·발주" },
  { href: "/alerts", label: "알림" },
  { href: "/imports", label: "데이터 인테이크" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-xs font-bold text-white">
            WS
          </span>
          <span className="text-sm font-bold text-slate-900">
            WeP-Stock
            <span className="ml-2 hidden font-normal text-slate-400 sm:inline">
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
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
