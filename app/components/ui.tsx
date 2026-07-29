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
  bodyClassName = "p-4",
  action,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`border border-line bg-surface ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-2">
          <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
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
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          {title}
          {count != null && (
            <span className="rounded-sm bg-paper px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-muted">
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

// 지표는 색점·링 없이 숫자 색만으로 구분한다. 점과 테두리 링을 얹으면
// 지표 6개가 나란히 놓였을 때 장식이 데이터보다 먼저 읽힌다.
const KPI_TONE: Record<string, string> = {
  default: "text-ink",
  accent: "text-accent-dark",
  danger: "text-crit",
  warn: "text-warn",
  good: "text-ok",
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
  const tone_ = KPI_TONE[tone] ?? KPI_TONE.default;
  const inner = (
    <>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`mt-1 font-mono text-[26px] font-medium leading-none tabular-nums ${tone_}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-2xs leading-snug text-ink-faint">{hint}</div>}
    </>
  );
  // 카드가 아니라 '구획'이다 — 격자 안에서 선으로만 나뉜다.
  const cls = "block bg-surface px-4 py-3";
  if (href) {
    return (
      <Link href={href} className={`${cls} transition-colors hover:bg-accent-soft`}>
        {inner}
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
    <div className="border border-line bg-surface px-4 py-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`mt-1 font-mono text-[24px] font-medium leading-none tabular-nums ${toneClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-2xs leading-snug text-ink-faint">{sub}</div>}
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
    // 알약형 토글 대신 문서 탭. 선택된 탭만 아래 선을 지워 본문과 이어지게 한다.
    <div className="flex flex-wrap items-end gap-0 border-b border-line">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-[13.5px] transition-colors ${
              on
                ? "border-b-accent font-semibold text-accent-dark"
                : "border-b-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 font-mono text-xs tabular-nums text-ink-faint">{t.count}</span>
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
  "border border-line bg-surface px-2.5 py-1.5 text-[13.5px] text-ink outline-none focus:border-accent disabled:bg-paper disabled:text-ink-faint";

export function Select({ className = "", ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL} ${className}`} {...p} />;
}

export function TextInput({ className = "", ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} placeholder:text-ink-faint ${className}`} {...p} />;
}

// 배지는 알약이 아니라 '왼쪽 굵은 선 + 글자'다. 표에 수십 개가 깔려도
// 배경색이 데이터를 덮지 않고, 흑백 인쇄나 색각 이상에서도 위치로 구분된다.
const MARK = "inline-block border-l-[3px] pl-1.5 text-xs font-medium leading-tight";

export function RiskBadge({ level }: { level: string }) {
  return (
    <span className={`${MARK} ${RISK_CLASS[level] ?? "border-l-line text-ink-muted"}`}>
      {RISK_LABEL[level] ?? level}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${MARK} ${STATUS_CLASS[status] ?? "border-l-line text-ink-muted"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-3 py-1.5 text-left text-2xs font-semibold text-ink-muted ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-1.5 text-[13.5px] tabular-nums text-ink ${className}`}>{children}</td>;
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
        <div key={i} className="rounded-sm border border-line bg-surface p-4">
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
      <div className="grid h-11 w-11 place-items-center rounded-sm bg-paper text-ink-faint">
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
        <h1 className="text-balance text-[19px] font-semibold text-ink">{title}</h1>
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
