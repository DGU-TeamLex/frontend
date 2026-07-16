"use client";
import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import { Card, StatusBadge, RiskBadge, Th, Td, State, PageTitle, SkeletonTable, EmptyState, Stat, SkeletonStatGrid } from "../components/ui";
import RequireRole from "../components/RequireRole";

// 이슈 #23 (FE · W3): 재고·발주권고 뷰 — 세부품목 단위 표기(3cc/5cc, 1L/2L).
// 발주권고 수치는 backend 발주권고 API(/order-recommendations, 모듈 D 실데이터)를 소비한다.
// 세부품목(규격) 단위 표기는 표준품목명 + 단위(uom)로 나타내며, 규격을 별도 컬럼으로
// 분리한 완전한 세부품목 발주권고 API 는 backend #43 완료 후 연동한다.

function OrderRecommendations() {
  const { data, loading, error } = useApi<any>("/order-recommendations");
  const rows: any[] = data?.items ?? [];
  const [onlyRisk, setOnlyRisk] = useState(false);

  const shown = useMemo(
    () => (onlyRisk ? rows.filter((r) => r.supplyRiskLevel && r.supplyRiskLevel !== "NORMAL") : rows),
    [rows, onlyRisk],
  );

  const totalQty = rows.reduce((s, r) => s + (r.recommendedQty ?? 0), 0);
  const critical = rows.filter((r) => r.status === "CRITICAL").length;
  const uomKinds = new Set(rows.map((r) => r.uom).filter(Boolean)).size;

  return (
    <div>
      <PageTitle
        title="발주권고 (세부품목 단위)"
        desc="모듈 D 발주권고를 세부품목(표준품목·규격/단위) 단위로 표기합니다. 수량은 backend 발주권고 API(/order-recommendations)를 소비하며, 발주권고 > 0 인 항목만 대상입니다."
      />

      {error && <State loading={false} error={error} />}

      {loading ? (
        <SkeletonStatGrid count={3} />
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="발주권고 품목 수" value={num(rows.length)} sub={`세부품목 단위(규격) ${num(uomKinds)}종`} />
          <Stat label="총 발주권고 수량" value={num(totalQty)} />
          <Stat label="긴급 부족 품목" value={num(critical)} tone={critical > 0 ? "danger" : "good"} />
        </div>
      )}

      {loading && (
        <Card title="발주권고 목록">
          <SkeletonTable cols={7} rows={8} />
        </Card>
      )}

      {data && (
        <Card
          title={`발주권고 목록 (${num(shown.length)}건)`}
          action={
            <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
              <input type="checkbox" checked={onlyRisk} onChange={(e) => setOnlyRisk(e.target.checked)} className="h-3.5 w-3.5" />
              공급위험 품목만
            </label>
          }
        >
          {shown.length === 0 ? (
            <EmptyState title="발주권고 항목이 없습니다" desc="발주권고 수량이 0 을 초과하는 항목이 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <Th>기관</Th>
                    <Th>세부품목 (표준코드)</Th>
                    <Th>규격/단위</Th>
                    <Th className="text-right">가용재고</Th>
                    <Th className="text-right">ROP</Th>
                    <Th className="text-right">발주권고</Th>
                    <Th>공급위험</Th>
                    <Th>상태</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((r, i) => (
                    <tr key={i} className={r.status === "CRITICAL" ? "bg-crit-soft/40" : ""}>
                      <Td>{r.institutionName}</Td>
                      <Td className="font-medium">
                        {r.standardName}
                        <span className="ml-1 font-mono text-xs text-ink-faint">{r.standardCode}</span>
                      </Td>
                      <Td>
                        <span className="rounded-md border border-line bg-paper px-2 py-0.5 font-mono text-xs text-ink-muted">
                          {r.uom ?? "-"}
                        </span>
                      </Td>
                      <Td className="text-right">{num(r.available)}</Td>
                      <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                      <Td className="text-right"><span className="font-bold text-ink">{num(r.recommendedQty)}</span></Td>
                      <Td>{r.supplyRiskLevel ? <RiskBadge level={r.supplyRiskLevel} /> : <span className="text-ink-faint">-</span>}</Td>
                      <Td><StatusBadge status={r.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-faint">
            규격/단위(uom)는 표준품목 마스터의 단위 표기(예: 3cc/5cc, 1L/2L)를 그대로 노출합니다. 규격을 독립 컬럼으로 분리한 완전한 세부품목 발주권고 API 는 backend #43 완료 후 연동합니다.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function OrderRecommendationsPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <OrderRecommendations />
    </RequireRole>
  );
}
