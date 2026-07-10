import Link from "next/link";
import {
  RISK_CLASS,
  RISK_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
} from "../lib/format";

export function Card({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface shadow-card ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-serif text-[15px] font-bold text-ink">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "danger" | "warn" | "good";
}) {
  const toneClass = {
    default: "text-ink",
    danger: "text-crit",
    warn: "text-warn",
    good: "text-ok",
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="text-xs font-medium tracking-wide text-ink-muted">{label}</div>
      <div className={`mt-1.5 font-serif text-[26px] font-bold leading-none lining-nums tabular-nums ${toneClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

export function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${RISK_CLASS[level] ?? "border-line bg-paper text-ink-muted"}`}
    >
      {RISK_LABEL[level] ?? level}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[status] ?? "border-line bg-paper text-ink-muted"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-2.5 text-sm tabular-nums text-ink ${className}`}>{children}</td>;
}

export function State({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <p className="text-sm text-ink-faint">불러오는 중…</p>;
  if (error) return <p className="text-sm text-crit">API 오류: {error}</p>;
  return null;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/60 ${className}`} />;
}

/** 테이블 로딩 스켈레톤 — cols 는 실제 컬럼 수에 맞춰 <Th> 개수와 동일하게. */
export function SkeletonTable({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line px-3 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2.5 h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1.5 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  desc,
  icon,
}: {
  title: string;
  desc?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-paper text-ink-faint">
        {icon ?? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {desc && <p className="max-w-xs text-xs text-ink-faint">{desc}</p>}
    </div>
  );
}

export function PageTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-balance font-serif text-2xl font-bold text-ink">{title}</h1>
      {desc && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{desc}</p>}
    </div>
  );
}

export { Link };
