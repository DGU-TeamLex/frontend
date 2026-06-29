"use client";
import { useApi } from "./lib/api";
import { num, riskColorBar, RISK_LABEL, ALERT_TYPE_LABEL } from "./lib/format";
import {
  Card,
  Stat,
  RiskBadge,
  Th,
  Td,
  State,
  PageTitle,
  Link,
} from "./components/ui";

export default function CentralDashboard() {
  const { data, loading, error } = useApi<any>("/dashboard/central");

  return (
    <div>
      <PageTitle
        title="중앙 대시보드"
        desc={`전국 보건기관 의료물품 재고·공급위험 현황 (기준일 ${data?.asOf ?? "—"})`}
      />
      <State loading={loading} error={error} />
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="등록 기관" value={num(data.summary.institutions)} sub="보건소·지소·진료소" />
            <Stat label="표준품목" value={num(data.summary.standardItems)} sub={`${data.summary.itemGroups}개 품목군`} />
            <Stat label="총 보유재고" value={num(data.summary.totalOnHand)} sub="전 기관 합계" />
            <Stat label="재주문점 미달" value={num(data.summary.belowRopItems)} sub="품목·기관 건" tone="warn" />
            <Stat label="미해결 알림" value={num(data.summary.openAlerts)} tone="danger" />
            <Stat label="공급위험 심각" value={num(data.summary.criticalRiskGroups)} sub="품목군" tone="danger" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="품목군 공급위험 랭킹 (모듈 C)">
              <ul className="space-y-3">
                {data.supplyRiskRanking.map((r: any) => (
                  <li key={r.itemGroupId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{r.itemGroupName}</span>
                      <span className="flex items-center gap-2">
                        <RiskBadge level={r.level} />
                        <span className="w-8 text-right font-mono text-slate-500">{r.riskScore}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${riskColorBar[r.level] ?? "bg-slate-400"}`}
                        style={{ width: `${r.riskScore}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/supply-risk" className="mt-4 inline-block text-xs font-semibold text-slate-500 hover:text-slate-900">
                공급위험 상세 →
              </Link>
            </Card>

            <Card title="부족 상위 기관">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>기관</Th>
                    <Th className="text-right">미달 품목 수</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.topShortageInstitutions.map((s: any) => (
                    <tr key={s.institutionId}>
                      <Td>{s.institutionName}</Td>
                      <Td className="text-right font-semibold text-orange-600">{s.shortageItems}</Td>
                      <Td className="text-right">
                        <Link href={`/institutions?id=${s.institutionId}`} className="text-xs text-slate-500 hover:text-slate-900">
                          보기 →
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card title="재배치 제안 (모듈 D)">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>품목</Th>
                  <Th>보내는 기관</Th>
                  <Th>받는 기관</Th>
                  <Th className="text-right">제안 수량</Th>
                  <Th>사유</Th>
                  <Th>상태</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.relocations.map((r: any) => (
                  <tr key={r.id}>
                    <Td className="font-medium">{r.standardName}</Td>
                    <Td>{r.fromName}</Td>
                    <Td>{r.toName}</Td>
                    <Td className="text-right font-semibold">{num(r.suggestedQty)}</Td>
                    <Td className="text-slate-500">{r.reason}</Td>
                    <Td>
                      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">{r.status}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
