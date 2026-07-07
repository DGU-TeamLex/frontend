"use client";
import { useApi } from "../lib/api";
import { num, CRITICALITY_LABEL } from "../lib/format";
import { Card, StatusBadge, RiskBadge, Th, Td, State, PageTitle } from "../components/ui";

export default function InventoryPage() {
  const { data, loading, error } = useApi<any>("/inventory-policy");
  const rows = data?.items ?? [];

  return (
    <div>
      <PageTitle
        title="적정재고 · 발주권고 (모듈 D)"
        desc="수요분포 + 공급위험 + 재고 + 리드타임 → 안전재고(SS)·재주문점(ROP)·발주권고. z·리드타임은 공급위험 레벨에 따라 동적 상향."
      />
      <State loading={loading} error={error} />
      {data && (
        <Card title={`재고·정책 현황 (${rows.length}건)`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>기관</Th>
                  <Th>품목 (표준코드)</Th>
                  <Th>구분</Th>
                  <Th className="text-right">가용재고</Th>
                  <Th className="text-right">SS</Th>
                  <Th className="text-right">ROP</Th>
                  <Th className="text-right">발주권고</Th>
                  <Th>공급위험</Th>
                  <Th>상태</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r: any, i: number) => (
                  <tr key={i} className={r.status === "CRITICAL" ? "bg-crit-soft/40" : ""}>
                    <Td>{r.institutionName}</Td>
                    <Td className="font-medium">
                      {r.standardName}
                      <span className="ml-1 font-mono text-xs text-ink-faint">{r.standardCode}</span>
                    </Td>
                    <Td className="text-xs text-ink-muted">{CRITICALITY_LABEL[r.criticality] ?? r.criticality}</Td>
                    <Td className="text-right font-semibold">{num(r.available)}</Td>
                    <Td className="text-right text-ink-muted">{num(r.SS)}</Td>
                    <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                    <Td className="text-right">
                      {r.orderRecommendation > 0 ? (
                        <span className="font-bold text-ink">{num(r.orderRecommendation)}</span>
                      ) : (
                        <span className="text-ink-faint">0</span>
                      )}
                    </Td>
                    <Td><RiskBadge level={r.supplyRiskLevel} /></Td>
                    <Td><StatusBadge status={r.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            SS = z·σ·√L, ROP = μ·L + SS. 리드타임은 가정값(배지) 기준이며 민감도 분석 대상입니다.
          </p>
        </Card>
      )}
    </div>
  );
}
