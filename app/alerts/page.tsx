"use client";
import { useApi } from "../lib/api";
import { ALERT_TYPE_LABEL } from "../lib/format";
import { Card, RiskBadge, Th, Td, State, PageTitle, SkeletonTable, EmptyState } from "../components/ui";
import RequireRole from "../components/RequireRole";

function Alerts() {
  const { data, loading, error } = useApi<any>("/alerts");
  const rows = data?.items ?? [];

  return (
    <div>
      <PageTitle
        title="알림"
        desc="재고미달·공급위험·유효기간임박 알림. 의료용품은 실시간, 소모품은 월주기 평가. 쿨다운·상태변화 시 재발송."
      />
      {error && <State loading={false} error={error} />}
      {loading && (
        <Card title="알림 목록">
          <SkeletonTable cols={6} rows={8} />
        </Card>
      )}
      {data && (
        <Card title={`알림 목록 (미해결 ${rows.filter((a: any) => !a.resolvedAt).length} / 전체 ${rows.length})`}>
          {rows.length === 0 ? (
            <EmptyState title="알림이 없습니다" desc="조건에 해당하는 알림이 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <Th>심각도</Th>
                    <Th>유형</Th>
                    <Th>제목</Th>
                    <Th>대상 기관</Th>
                    <Th>발생</Th>
                    <Th>상태</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((a: any) => (
                    <tr key={a.alertId}>
                      <Td><RiskBadge level={a.severity} /></Td>
                      <Td className="text-xs text-ink-muted">{ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}</Td>
                      <Td className="font-medium">
                        {a.title}
                        <div className="text-xs font-normal text-ink-faint">{a.message}</div>
                      </Td>
                      <Td>{a.institutionName ?? <span className="text-ink-faint">전국/품목군</span>}</Td>
                      <Td className="text-xs text-ink-muted">{(a.generatedAt ?? "").slice(0, 10)}</Td>
                      <Td>
                        {a.resolvedAt ? (
                          <span className="rounded-full border border-transparent bg-ok-soft px-2 py-0.5 text-xs text-ok">처리됨</span>
                        ) : (
                          <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs text-ink-muted">미해결</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <RequireRole>
      <Alerts />
    </RequireRole>
  );
}
