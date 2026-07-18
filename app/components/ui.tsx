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
  bodyClassName = "p-5",
  action,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface shadow-card ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-serif text-[15px] font-bold text-ink">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** 페이지 안 소단위 섹션 헤더 (Card 없이 쓰는 구획). */
export function SectionHeader({
  title,
  desc,
  action,
  count,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  count?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink">
          {title}
          {count != null && (
            <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-muted">
              {count}
            </span>
          )}
        </h2>
        {desc && <p className="mt-0.5 text-xs text-ink-faint">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

const KPI_TONE: Record<string, { v: string; ring: string; dot: string }> = {
  default: { v: "text-ink", ring: "", dot: "bg-ink-faint" },
  accent: { v: "text-accent-dark", ring: "", dot: "bg-accent" },
  danger: { v: "text-crit", ring: "ring-crit/20", dot: "bg-crit" },
  warn: { v: "text-warn", ring: "ring-warn/20", dot: "bg-warn" },
  good: { v: "text-ok", ring: "ring-ok/20", dot: "bg-ok" },
};

/** 대시보드 핵심 지표 카드. href 주면 클릭 가능(드릴다운). */
export function Kpi({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "danger" | "warn" | "good";
  href?: string;
}) {
  const t = KPI_TONE[tone];
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
        <span className="text-xs font-medium tracking-wide text-ink-muted">{label}</span>
      </div>
      <div className={`mt-2 font-serif text-[28px] font-bold leading-none lining-nums tabular-nums ${t.v}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-ink-faint">{hint}</div>}
    </>
  );
  const cls = `block rounded-xl border border-line bg-surface p-4 shadow-card ${t.ring ? `ring-1 ${t.ring}` : ""}`;
  if (href) {
    return (
      <Link href={href} className={`${cls} group relative transition-shadow hover:shadow-md`}>
        {inner}
        <svg
          className="absolute right-3 top-3 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
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

/** 가로 분포 막대 (심각도·상태 구성 비율). segments 합이 0이면 회색 빈 막대. */
export function DistBar({
  segments,
  className = "",
}: {
  segments: { value: number; className: string; label?: string }[];
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-line/60">
        {total > 0 &&
          segments.map((s, i) =>
            s.value > 0 ? (
              <div
                key={i}
                className={s.className}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={s.label ? `${s.label}: ${s.value}` : undefined}
              />
            ) : null
          )}
      </div>
    </div>
  );
}

/** 컨트롤드 탭 바 (부모가 active 상태 관리). */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1 shadow-card">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              on ? "bg-accent text-white shadow-card" : "text-ink-muted hover:bg-paper hover:text-ink"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-white/20" : "bg-paper text-ink-faint"}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** 필터 툴바 래퍼 + 입력 컴포넌트들. */
export function Toolbar({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-end gap-2.5 ${className}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</span>
      {children}
    </label>
  );
}

const CONTROL =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-card outline-none focus:border-accent disabled:bg-paper disabled:text-ink-faint";

export function Select({ className = "", ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL} ${className}`} {...p} />;
}

export function TextInput({ className = "", ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} placeholder:text-ink-faint ${className}`} {...p} />;
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

export function PageTitle({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-balance font-serif text-2xl font-bold text-ink">{title}</h1>
        {desc && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/** 아직 실 파이프라인이 없어 고정 목업값을 보여주는 화면/영역 상단에 붙이는 경고 배너. */
export function MockBanner({ reason, className = "" }: { reason: string; className?: string }) {
  return (
    <div
      className={`mb-4 flex items-start gap-2.5 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-warn ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
        <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="text-sm">
        <span className="font-bold">MOCK 데이터</span>
        <span className="ml-1.5 text-warn/90">{reason}</span>
      </div>
    </div>
  );
}

export { Link };
