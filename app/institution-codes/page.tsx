"use client";
import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import { Card, StatusBadge, Th, Td, State, PageTitle, Skeleton, SkeletonList, SkeletonTable, EmptyState } from "../components/ui";
import RequireRole from "../components/RequireRole";

// 이슈 #22 (FE · W1): REST 계약 기반 화면 골격 + 기관코드 목록/상세.
// 기관코드↔실명 매핑은 아직 정보원 대기(backend #16) 상태라 "잠정" 전제로,
// 이 화면은 기관명·지역을 표출하지 않고 익명 기관코드 기준으로만 목록/상세를 보여준다.

const BADGE_CLASS: Record<string, string> = {
  CRITICAL: "bg-crit-soft text-crit border-transparent",
  WARN: "bg-warn-soft text-warn border-transparent",
  WATCH: "bg-caution-soft text-caution border-transparent",
  OK: "bg-ok-soft text-ok border-transparent",
};

function InstitutionCodes() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // 전국 기관을 코드 기준으로 조회(지역·유형 필터 없이 골격 확인용 상위 N건).
  const list = useApi<any>("/facilities?limit=300");
  const items: any[] = list.data?.items ?? [];

  // 기관코드(id)로만 필터 — 기관명은 매핑 미확정이라 검색 대상에서 제외.
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((f) => String(f.id).toLowerCase().includes(term));
  }, [items, q]);

  const detail = useApi<any>(selected ? `/facilities/${selected}` : null);

  return (
    <div>
      <PageTitle
        title="기관코드 목록·상세 (REST 계약 골격)"
        desc="back↔front REST 계약 기반 화면 골격입니다. 기관코드↔실명 매핑이 미확정(backend #16)이라 기관명·지역은 표출하지 않고 익명 기관코드 기준으로만 조회합니다."
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-caution/40 bg-caution-soft px-4 py-3 text-caution">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="text-sm">
          <span className="font-bold">익명 매핑 잠정</span>
          <span className="ml-1.5 text-caution/90">기관코드↔실제 기관명·지역 대응은 아직 확정 전이라 이 화면에서는 표출하지 않습니다(backend #16 대기).</span>
        </div>
      </div>

      <div className="mb-5 max-w-sm">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">기관코드 검색</div>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); }}
          placeholder="기관코드로 검색"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* 좌: 기관코드 목록 */}
        <Card className="!p-0" title={list.data ? `기관코드 (${num(filtered.length)}/${num(list.data.totalElements)}곳)` : "기관코드 목록"}>
          <div className="p-3">
            {list.error && <State loading={false} error={list.error} />}
            {list.loading && <SkeletonList rows={8} />}
            {list.data && filtered.length === 0 && (
              <EmptyState title="해당 코드의 기관이 없습니다" desc="다른 기관코드로 다시 시도해보세요." />
            )}
            <ul className="space-y-1">
              {filtered.map((f) => {
                const active = selected === f.id;
                const b = f.summary?.badge ?? { level: "OK", label: "정상", count: 0 };
                return (
                  <li key={f.id}>
                    <button
                      onClick={() => setSelected(f.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        active ? "bg-accent-soft ring-1 ring-accent/30" : "hover:bg-paper"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-xs font-semibold text-ink">{f.id}</span>
                        <span className="block text-xs text-ink-faint">관리 품목 {num(f.summary?.trackedItems ?? 0)}종</span>
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${BADGE_CLASS[b.level] ?? "border-line bg-paper text-ink-muted"}`}>
                        {b.label}{b.count ? ` ${b.count}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {list.data?.truncated && (
              <p className="px-2 pt-2 text-xs text-ink-faint">상위 {num(list.data.returned)}곳만 표시 (총 {num(list.data.totalElements)}곳)</p>
            )}
          </div>
        </Card>

        {/* 우: 선택 기관코드 재고 상세 (기관명·지역 미표출) */}
        <Card title={selected ? `기관코드 ${selected} — 재고 현황` : "재고 현황"}>
          {!selected && (
            <EmptyState title="기관코드를 선택하세요" desc="왼쪽 목록에서 기관코드를 선택하면 해당 기관의 재고 현황이 표시됩니다." />
          )}
          {detail.error && <State loading={false} error={detail.error} />}
          {detail.loading && (
            <>
              <div className="mb-5 grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-paper p-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-2 h-6 w-10" />
                  </div>
                ))}
              </div>
              <SkeletonTable cols={6} rows={6} />
            </>
          )}
          {detail.data && (
            <>
              <div className="mb-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-paper p-3"><div className="text-xs text-ink-muted">관리 품목</div><div className="font-serif text-lg font-bold lining-nums tabular-nums text-ink">{num(detail.data.summary?.trackedItems)}</div></div>
                <div className="rounded-lg bg-warn-soft p-3"><div className="text-xs text-ink-muted">재주문점 미달</div><div className="font-serif text-lg font-bold lining-nums tabular-nums text-warn">{num(detail.data.summary?.belowRop)}</div></div>
                <div className="rounded-lg bg-paper p-3"><div className="text-xs text-ink-muted">발주 필요</div><div className="font-serif text-lg font-bold lining-nums tabular-nums text-ink">{num(detail.data.summary?.orderNeeded)}</div></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <Th>품목 (표준코드)</Th>
                      <Th className="text-right">현재고</Th>
                      <Th className="text-right">가용</Th>
                      <Th className="text-right">ROP</Th>
                      <Th className="text-right">발주권고</Th>
                      <Th>상태</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {detail.data.inventory?.map((r: any, i: number) => (
                      <tr key={i} className={r.status === "CRITICAL" ? "bg-crit-soft/40" : ""}>
                        <Td className="font-medium">{r.standardName}<span className="ml-1 font-mono text-xs text-ink-faint">{r.standardCode}</span></Td>
                        <Td className="text-right">{num(r.onHand)}</Td>
                        <Td className="text-right font-semibold">{num(r.available)}</Td>
                        <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                        <Td className="text-right">{r.orderRecommendation > 0 ? <span className="font-bold">{num(r.orderRecommendation)}</span> : <span className="text-ink-faint">0</span>}</Td>
                        <Td><StatusBadge status={r.status} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-ink-faint">
                품목 표시 소스는 표준품목 마스터(data canonical, backend #42 노출 예정)입니다. 재고 수치는 실데이터이나 이 코드가 매칭되는 실제 기관은 매핑 확정 전입니다.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function InstitutionCodesPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <InstitutionCodes />
    </RequireRole>
  );
}
