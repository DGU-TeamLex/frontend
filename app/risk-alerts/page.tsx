"use client";
import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { num, riskColorBar, ALERT_TYPE_LABEL } from "../lib/format";
import { Card, RiskBadge, Th, Td, State, PageTitle, Skeleton, SkeletonTable, EmptyState } from "../components/ui";
import RequireRole from "../components/RequireRole";

// 이슈 #24 (FE · W4): 공급위험 경보 뷰(레벨) + 실데이터 실연동 + 2-뷰(기관/중앙).
//  - 중앙 뷰: 품목군 공급위험 레벨/점수 (/supply-risk, 모듈 C)
//  - 기관 뷰: 기관별 공급위험 경보 (/alerts?type=SUPPLY_RISK)
// 기관별 경보 서빙 API(backend #44)와 경보 레벨 산정이 확장되면 기관 뷰가 자동으로 채워진다.

type View = "central" | "institution";

function CentralView() {
  const { data, loading, error } = useApi<any>("/supply-risk");
  const items: any[] = data?.items ?? [];

  if (error) return <State loading={false} error={error} />;
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-14" />
            </div>
            <Skeleton className="mt-4 h-1.5 w-full" />
          </div>
        ))}
      </div>
    );
  }
  if (items.length === 0) return <EmptyState title="공급위험 데이터가 없습니다" />;

  return (
    <div className="space-y-4">
      {items.map((r) => (
        <Card key={r.itemGroupId}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-base font-bold text-ink">{r.itemGroupName}</h3>
                <RiskBadge level={r.level} />
              </div>
              {r.date && <div className="mt-1 text-xs text-ink-muted">기준일 {r.date}</div>}
            </div>
            <div className="text-right">
              <div className="font-serif text-3xl font-bold lining-nums tabular-nums text-ink">{num(r.riskScore)}</div>
              <div className="text-xs text-ink-faint">/ 100</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper">
            <div className={`h-full rounded-full ${riskColorBar[r.level] ?? "bg-ok"}`} style={{ width: `${Math.min(r.riskScore ?? 0, 100)}%` }} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function InstitutionView() {
  const { data, loading, error } = useApi<any>("/alerts?type=SUPPLY_RISK");
  const rows: any[] = data?.items ?? [];

  const byInstitution = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const a of rows) {
      const key = a.institutionName ?? a.institutionId ?? "전국/품목군";
      (m.get(key) ?? m.set(key, []).get(key))!.push(a);
    }
    return Array.from(m.entries());
  }, [rows]);

  if (error) return <State loading={false} error={error} />;
  if (loading) {
    return (
      <Card title="기관별 공급위험 경보">
        <SkeletonTable cols={4} rows={6} />
      </Card>
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="기관별 공급위험 경보가 아직 없습니다"
        desc="공급위험 점수→기관별 경보 서빙(backend #44)이 연동되면 이 뷰가 채워집니다. 현재는 재고미달 등 다른 유형의 알림만 존재할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      {byInstitution.map(([inst, alerts]) => (
        <Card key={inst} title={`${inst} · 경보 ${num(alerts.length)}건`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>레벨</Th>
                  <Th>유형</Th>
                  <Th>내용</Th>
                  <Th>발생</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {alerts.map((a) => (
                  <tr key={a.alertId}>
                    <Td><RiskBadge level={a.severity} /></Td>
                    <Td className="text-xs text-ink-muted">{ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}</Td>
                    <Td className="font-medium">
                      {a.title}
                      <div className="text-xs font-normal text-ink-faint">{a.message}</div>
                    </Td>
                    <Td className="text-xs text-ink-muted">{(a.generatedAt ?? "").slice(0, 10)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RiskAlerts() {
  const [view, setView] = useState<View>("central");

  return (
    <div>
      <PageTitle
        title="공급위험 경보 (2-뷰)"
        desc="공급위험 레벨을 중앙(품목군)·기관(기관별 경보) 두 관점으로 봅니다. 중앙은 /supply-risk, 기관은 /alerts(type=SUPPLY_RISK) 를 실연동합니다."
      />

      <div className="mb-5 inline-flex rounded-lg border border-line bg-surface p-1 text-sm">
        {(["central", "institution"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-4 py-1.5 font-medium transition-colors ${
              view === v ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {v === "central" ? "중앙 뷰 (품목군)" : "기관 뷰 (기관별)"}
          </button>
        ))}
      </div>

      {view === "central" ? <CentralView /> : <InstitutionView />}
    </div>
  );
}

export default function RiskAlertsPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <RiskAlerts />
    </RequireRole>
  );
}
