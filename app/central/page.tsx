"use client";
import { useApi } from "../lib/api";
import { num, riskColorBar, RISK_LABEL, ALERT_TYPE_LABEL } from "../lib/format";
import {
  Card,
  Stat,
  RiskBadge,
  Th,
  Td,
  State,
  PageTitle,
  Link,
  SkeletonStatGrid,
  SkeletonTable,
  EmptyState,
  MockBanner,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

function Central() {
  const { data, loading, error } = useApi<any>("/dashboard/central");

  return (
    <div>
      <PageTitle
        title="중앙 대시보드"
        desc={`전국 보건기관 의료물품 재고·공급위험 현황 (기준일 ${data?.asOf ?? "—"})`}
      />
      {error && <State loading={false} error={error} />}
      {loading && (
        <div className="space-y-6">
          <SkeletonStatGrid />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="품목군 공급위험 랭킹 (모듈 C)"><SkeletonTable cols={2} rows={5} /></Card>
            <Card title="부족 상위 기관"><SkeletonTable cols={2} rows={5} /></Card>
          </div>
        </div>
      )}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="등록 기관" value={num(data.summary.institutions)} sub="보건소·지소·진료소" />
            <Stat label="표준품목" value={num(data.summary.standardItems)} sub={`${data.summary.itemGroups}개 품목군`} />
            <Stat label="총 보유재고" value={num(data.summary.totalOnHand)} sub="전 기관 합계" />
            <Stat label="재주문점 미달" value={num(data.summary.belowRopItems)} sub="품목·기관 건" tone="warn" />
            <Stat label="미해결 알림" value={num(data.summary.openAlerts)} tone="danger" />
            <Stat label="공급위험 심각(MOCK)" value={num(data.summary.criticalRiskGroups)} sub="품목군" tone="danger" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="품목군 공급위험 랭킹 (모듈 C)">
              <MockBanner reason="원자재 가격·뉴스지수 외부 연동 전 — 고정된 시연용 값입니다." />
              <ul className="space-y-3.5">
                {data.supplyRiskRanking.map((r: any) => (
                  <li key={r.itemGroupId}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{r.itemGroupName}</span>
                      <span className="flex items-center gap-2">
                        <RiskBadge level={r.level} />
                        <span className="w-8 text-right font-mono tabular-nums text-ink-muted">{r.riskScore}</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
                      <div
                        className={`h-full rounded-full ${riskColorBar[r.level] ?? "bg-ink-faint"}`}
                        style={{ width: `${r.riskScore}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/supply-risk" className="mt-4 inline-block text-xs font-semibold text-ink-muted hover:text-accent">
                공급위험 상세 →
              </Link>
            </Card>

            <Card title="부족 상위 기관">
              {data.topShortageInstitutions.length === 0 ? (
                <EmptyState title="부족 기관이 없습니다" desc="현재 재주문점 미달 품목을 보유한 기관이 없습니다." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line">
                        <Th>기관</Th>
                        <Th className="text-right">미달 품목 수</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {data.topShortageInstitutions.map((s: any) => (
                        <tr key={s.institutionId}>
                          <Td>{s.institutionName}</Td>
                          <Td className="text-right font-semibold text-warn">{s.shortageItems}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <Card title="재배치 제안 (모듈 D)">
            <MockBanner reason="기관 간 재배치 최적화 로직 미구현 — 고정된 시연용 값입니다." />
            {data.relocations.length === 0 ? (
              <EmptyState title="재배치 제안이 없습니다" desc="현재 기관 간 재배치가 권장되는 품목이 없습니다." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <Th>품목</Th>
                      <Th>보내는 기관</Th>
                      <Th>받는 기관</Th>
                      <Th className="text-right">제안 수량</Th>
                      <Th>사유</Th>
                      <Th>상태</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.relocations.map((r: any) => (
                      <tr key={r.id}>
                        <Td className="font-medium">{r.standardName}</Td>
                        <Td>{r.fromName}</Td>
                        <Td>{r.toName}</Td>
                        <Td className="text-right font-semibold">{num(r.suggestedQty)}</Td>
                        <Td className="text-ink-muted">{r.reason}</Td>
                        <Td>
                          <span className="rounded border border-line bg-paper px-2 py-0.5 text-xs">{r.status}</span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function CentralPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <Central />
    </RequireRole>
  );
}
