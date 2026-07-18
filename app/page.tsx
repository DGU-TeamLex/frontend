"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useApi } from "./lib/api";
import { num } from "./lib/format";
import {
  Card, Kpi, SectionHeader, DistBar, RiskBadge, StatusBadge,
  Th, Td, State, Skeleton, SkeletonStatGrid, SkeletonTable, SkeletonList, EmptyState, MockBanner,
} from "./components/ui";
import RequireRole from "./components/RequireRole";

// 알림 심각도 표시 순서·색 (alertsBySeverity 는 동적 키 object)
const SEV_ORDER = ["HIGH", "MEDIUM", "LOW"];
const SEV = {
  HIGH: { label: "높음", dot: "bg-crit", bar: "bg-crit", text: "text-crit" },
  MEDIUM: { label: "중간", dot: "bg-warn", bar: "bg-warn", text: "text-warn" },
  LOW: { label: "낮음", dot: "bg-caution", bar: "bg-caution", text: "text-caution" },
} as Record<string, { label: string; dot: string; bar: string; text: string }>;

// 발주 우선순위 정렬: 상태 심각도 → 권고수량
const STATUS_RANK: Record<string, number> = { CRITICAL: 0, BELOW_ROP: 1, WATCH: 2, OK: 3 };

function Dashboard() {
  const dash = useApi<any>("/dashboard/central");
  const orders = useApi<any>("/order-recommendations");

  const s = dash.data?.summary;
  const sevEntries = useMemo(() => {
    const bs: Record<string, number> = dash.data?.alertsBySeverity ?? {};
    const keys = Object.keys(bs);
    keys.sort((a, b) => (SEV_ORDER.indexOf(a) + 99 * (SEV_ORDER.indexOf(a) < 0 ? 1 : 0)) - (SEV_ORDER.indexOf(b) + 99 * (SEV_ORDER.indexOf(b) < 0 ? 1 : 0)));
    return keys.map((k) => ({ key: k, count: bs[k] }));
  }, [dash.data]);

  const topOrders = useMemo(() => {
    const items: any[] = orders.data?.items ?? [];
    return [...items]
      .sort((a, b) =>
        (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
        (b.recommendedQty ?? 0) - (a.recommendedQty ?? 0)
      )
      .slice(0, 12);
  }, [orders.data]);

  const ranking: any[] = dash.data?.supplyRiskRanking ?? [];
  const shortage: any[] = dash.data?.topShortageInstitutions ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">전국 재고 현황</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            전국 보건의료기관의 재고·발주·공급위험을 한눈에. 아래 <b className="text-ink">지금 발주해야 할 품목</b>부터 확인하세요.
          </p>
        </div>
        {dash.data?.asOf && (
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-faint shadow-card">
            기준일 {dash.data.asOf}
          </span>
        )}
      </div>

      {/* KPI 밴드 */}
      {dash.loading && <SkeletonStatGrid count={5} />}
      {dash.error && <Card><State loading={false} error={dash.error} /></Card>}
      {s && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="관리 기관" value={num(s.institutions)} hint="전국 보건의료기관" href="/inventory" />
          <Kpi label="재주문점 미달" value={num(s.belowRopItems)} tone="danger" hint="발주 시급 품목" href="/inventory" />
          <Kpi label="미해결 알림" value={num(s.openAlerts)} tone="warn" hint="확인 필요" href="/alerts" />
          <Kpi label="위험 품목군" value={num(s.criticalRiskGroups)} tone="warn" hint="공급위험 CRITICAL" href="/supply-risk" />
          <Kpi label="표준품목" value={num(s.standardItems)} hint={`품목군 ${num(s.itemGroups)}종`} href="/inventory" />
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* 좌: 지금 발주해야 할 품목 (실데이터, 히어로) */}
        <Card
          bodyClassName="p-0"
          title="지금 발주해야 할 품목"
          action={
            <Link href="/inventory" className="text-xs font-semibold text-accent hover:text-accent-dark">
              전체 재고·발주 →
            </Link>
          }
        >
          {orders.loading && <div className="p-4"><SkeletonTable cols={5} rows={8} /></div>}
          {orders.error && <div className="p-5"><State loading={false} error={orders.error} /></div>}
          {orders.data && topOrders.length === 0 && (
            <EmptyState title="발주가 필요한 품목이 없습니다" desc="모든 품목이 재주문점 이상입니다." />
          )}
          {topOrders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <Th>기관 · 품목</Th>
                    <Th className="text-right">가용</Th>
                    <Th className="text-right">ROP</Th>
                    <Th className="text-right">권고수량</Th>
                    <Th>상태</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {topOrders.map((r, i) => (
                    <tr key={i} className={`transition-colors hover:bg-paper ${r.status === "CRITICAL" ? "bg-crit-soft/30" : ""}`}>
                      <Td className="max-w-0">
                        <span className="block truncate font-medium text-ink">{r.standardName}</span>
                        <span className="block truncate text-xs text-ink-faint">{r.institutionName}</span>
                      </Td>
                      <Td className="text-right font-semibold">{num(r.available)}</Td>
                      <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                      <Td className="text-right">
                        <span className="font-bold text-accent-dark">{num(r.recommendedQty)}</span>
                        <span className="ml-0.5 text-xs text-ink-faint">{r.uom}</span>
                      </Td>
                      <Td><StatusBadge status={r.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {orders.data?.totalElements > topOrders.length && (
            <div className="border-t border-line px-5 py-3 text-xs text-ink-faint">
              발주권고 총 {num(orders.data.totalElements)}건 중 상위 {topOrders.length}건 · 전체는 재고·발주에서
            </div>
          )}
        </Card>

        {/* 우: 알림 분포 + 부족 상위 기관 + 공급위험 랭킹 */}
        <div className="space-y-5">
          <Card title="알림 심각도">
            {dash.loading && <div className="space-y-2"><Skeleton className="h-2.5 w-full" /><Skeleton className="h-4 w-2/3" /></div>}
            {s && (
              <>
                <DistBar
                  className="mb-3"
                  segments={sevEntries.map((e) => ({
                    value: e.count,
                    className: SEV[e.key]?.bar ?? "bg-ink-faint",
                    label: SEV[e.key]?.label ?? e.key,
                  }))}
                />
                {sevEntries.length === 0 ? (
                  <p className="text-sm text-ink-faint">미해결 알림 없음</p>
                ) : (
                  <ul className="space-y-1.5">
                    {sevEntries.map((e) => (
                      <li key={e.key} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${SEV[e.key]?.dot ?? "bg-ink-faint"}`} />
                          <span className="text-ink-muted">{SEV[e.key]?.label ?? e.key}</span>
                        </span>
                        <span className={`font-bold tabular-nums ${SEV[e.key]?.text ?? "text-ink"}`}>{num(e.count)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/alerts" className="mt-3 block text-xs font-semibold text-accent hover:text-accent-dark">
                  알림 전체 보기 →
                </Link>
              </>
            )}
          </Card>

          <Card title="재고 부족 상위 기관">
            {dash.loading && <SkeletonList rows={5} />}
            {shortage.length === 0 && !dash.loading && <p className="text-sm text-ink-faint">부족 기관 없음</p>}
            <ul className="space-y-1">
              {shortage.map((f, i) => (
                <li key={f.institutionId}>
                  <Link
                    href={`/inventory?institution=${encodeURIComponent(f.institutionId)}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-paper"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-paper text-[11px] font-bold tabular-nums text-ink-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{f.institutionName}</span>
                    <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold tabular-nums text-warn">
                      {num(f.shortageItems)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* 공급위험 랭킹 (MOCK) */}
      <div className="mt-6">
        <SectionHeader
          title="공급위험 품목군 랭킹"
          desc="원자재·뉴스 기반 공급위험 점수 상위"
          action={<Link href="/supply-risk" className="text-xs font-semibold text-accent hover:text-accent-dark">공급위험 상세 →</Link>}
        />
        <MockBanner reason="공급위험 점수는 외부지표 실연동 전 데모 목업값입니다." />
        {dash.loading && <SkeletonStatGrid count={4} />}
        {ranking.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ranking.slice(0, 4).map((r) => (
              <Link
                key={r.itemGroupId}
                href={`/supply-risk`}
                className="rounded-xl border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-semibold text-ink">{r.itemGroupName}</span>
                  <RiskBadge level={r.level} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-xs text-ink-faint">위험점수</span>
                  <span className="font-serif text-xl font-bold tabular-nums text-ink">{num(r.riskScore)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <Dashboard />
    </RequireRole>
  );
}
