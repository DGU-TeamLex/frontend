"use client";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import {
  Card,
  StatusBadge,
  RiskBadge,
  Th,
  Td,
  State,
  PageTitle,
  SkeletonStatGrid,
  SkeletonTable,
  EmptyState,
} from "../components/ui";
import RequireRole from "../components/RequireRole";
import { useAuth } from "../lib/auth-context";

function MyInstitution() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<any>(user?.institutionId ? `/dashboard/institution/${user.institutionId}` : null);

  return (
    <div>
      <PageTitle
        title={data ? `${data.institution.name} — 재고 현황` : "내 기관 재고"}
        desc={data ? `${data.institution.sido} ${data.institution.sigungu} · ${data.institution.type} (기준일 ${data.asOf})` : "우리 기관의 재고·알림 현황을 확인합니다."}
      />
      {error && <State loading={false} error={error} />}
      {loading && (
        <div className="space-y-6">
          <SkeletonStatGrid count={4} />
          <Card title="재고 현황"><SkeletonTable cols={6} rows={8} /></Card>
        </div>
      )}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
              <div className="text-xs font-medium text-ink-muted">관리 품목</div>
              <div className="mt-1.5 font-serif text-[26px] font-bold leading-none lining-nums tabular-nums text-ink">{data.summary.trackedItems}</div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
              <div className="text-xs font-medium text-ink-muted">재주문점 미달</div>
              <div className="mt-1.5 font-serif text-[26px] font-bold leading-none lining-nums tabular-nums text-warn">{data.summary.belowRop}</div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
              <div className="text-xs font-medium text-ink-muted">발주 필요</div>
              <div className="mt-1.5 font-serif text-[26px] font-bold leading-none lining-nums tabular-nums text-ink">{data.summary.orderNeeded}</div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
              <div className="text-xs font-medium text-ink-muted">미해결 알림</div>
              <div className="mt-1.5 font-serif text-[26px] font-bold leading-none lining-nums tabular-nums text-crit">{data.summary.openAlerts}</div>
            </div>
          </div>

          <Card title={`재고 현황 (${data.inventory.length}건)`}>
            {data.inventory.length === 0 ? (
              <EmptyState title="관리 중인 품목이 없습니다" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <Th>품목 (표준코드)</Th>
                      <Th className="text-right">현재고</Th>
                      <Th className="text-right">가용</Th>
                      <Th className="text-right">ROP</Th>
                      <Th className="text-right">발주권고</Th>
                      <Th>공급위험</Th>
                      <Th>상태</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.inventory.map((r: any, i: number) => (
                      <tr key={i} className={r.status === "CRITICAL" ? "bg-crit-soft/40" : ""}>
                        <Td className="font-medium">
                          {r.standardName}
                          <span className="ml-1 font-mono text-xs text-ink-faint">{r.standardCode}</span>
                        </Td>
                        <Td className="text-right">{num(r.onHand)}</Td>
                        <Td className="text-right font-semibold">{num(r.available)}</Td>
                        <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                        <Td className="text-right">
                          {r.orderRecommendation > 0 ? <span className="font-bold">{num(r.orderRecommendation)}</span> : <span className="text-ink-faint">0</span>}
                        </Td>
                        <Td><RiskBadge level={r.supplyRiskLevel} /></Td>
                        <Td><StatusBadge status={r.status} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={`알림 (미해결 ${data.alerts.filter((a: any) => !a.resolvedAt).length} / 전체 ${data.alerts.length})`}>
            {data.alerts.length === 0 ? (
              <EmptyState title="알림이 없습니다" />
            ) : (
              <ul className="space-y-2">
                {data.alerts.map((a: any) => (
                  <li key={a.alertId} className="flex items-start justify-between gap-4 rounded-lg border border-line px-3 py-2.5">
                    <div>
                      <div className="text-sm font-medium text-ink">{a.title}</div>
                      <div className="text-xs text-ink-faint">{a.message}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <RiskBadge level={a.severity} />
                      {a.resolvedAt ? (
                        <span className="rounded-full border border-transparent bg-ok-soft px-2 py-0.5 text-xs text-ok">처리됨</span>
                      ) : (
                        <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs text-ink-muted">미해결</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MyPage() {
  return (
    <RequireRole roles={["INSTITUTION"]}>
      <MyInstitution />
    </RequireRole>
  );
}
