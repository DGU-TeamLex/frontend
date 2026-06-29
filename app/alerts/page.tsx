"use client";
import { useApi } from "../lib/api";
import { ALERT_TYPE_LABEL } from "../lib/format";
import { Card, RiskBadge, Th, Td, State, PageTitle } from "../components/ui";

export default function AlertsPage() {
  const { data, loading, error } = useApi<any>("/alerts");
  const rows = data?.items ?? [];

  return (
    <div>
      <PageTitle
        title="알림"
        desc="재고미달·공급위험·유효기간임박 알림. 의료용품은 실시간, 소모품은 월주기 평가. 쿨다운·상태변화 시 재발송."
      />
      <State loading={loading} error={error} />
      {data && (
        <Card title={`알림 목록 (미해결 ${rows.filter((a: any) => !a.resolvedAt).length} / 전체 ${rows.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>심각도</Th>
                  <Th>유형</Th>
                  <Th>제목</Th>
                  <Th>대상 기관</Th>
                  <Th>발생</Th>
                  <Th>상태</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((a: any) => (
                  <tr key={a.alertId}>
                    <Td><RiskBadge level={a.severity} /></Td>
                    <Td className="text-xs text-slate-500">{ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}</Td>
                    <Td className="font-medium">
                      {a.title}
                      <div className="text-xs font-normal text-slate-400">{a.message}</div>
                    </Td>
                    <Td>{a.institutionName ?? <span className="text-slate-400">전국/품목군</span>}</Td>
                    <Td className="text-xs text-slate-500">{(a.generatedAt ?? "").slice(0, 10)}</Td>
                    <Td>
                      {a.resolvedAt ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">처리됨</span>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">미해결</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
