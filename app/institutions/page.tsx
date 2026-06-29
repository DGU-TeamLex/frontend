"use client";
import { useEffect, useState } from "react";
import { getJSON, useApi } from "../lib/api";
import { num, INST_TYPE_LABEL, ALERT_TYPE_LABEL } from "../lib/format";
import { Card, Stat, StatusBadge, RiskBadge, Th, Td, State, PageTitle } from "../components/ui";

export default function InstitutionsPage() {
  const list = useApi<any>("/institutions");
  const [selected, setSelected] = useState<string | null>(null);
  const [dash, setDash] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(false);

  // 목록 로드되면 첫 기관 선택
  useEffect(() => {
    if (!selected && list.data?.items?.length) setSelected(list.data.items[0].institutionId);
  }, [list.data, selected]);

  useEffect(() => {
    if (!selected) return;
    setDashLoading(true);
    getJSON(`/dashboard/institution/${selected}`)
      .then(setDash)
      .finally(() => setDashLoading(false));
  }, [selected]);

  return (
    <div>
      <PageTitle title="기관 뷰" desc="기관 담당자(INST) 화면 — 본인 기관의 현재고·적정재고·발주권고·알림 (행 수준 권한)" />
      <State loading={list.loading} error={list.error} />

      <div className="mb-5 flex flex-wrap gap-2">
        {list.data?.items?.map((i: any) => (
          <button
            key={i.institutionId}
            onClick={() => setSelected(i.institutionId)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
              selected === i.institutionId
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <div className="font-semibold">{i.institutionName}</div>
            <div className={`text-xs ${selected === i.institutionId ? "text-slate-300" : "text-slate-400"}`}>
              {i.regionName} · {INST_TYPE_LABEL[i.institutionType] ?? i.institutionType}
            </div>
          </button>
        ))}
      </div>

      {dashLoading && <p className="text-sm text-slate-400">기관 현황 불러오는 중…</p>}
      {dash && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="관리 품목" value={num(dash.summary.trackedItems)} />
            <Stat label="재주문점 미달" value={num(dash.summary.belowRop)} tone="warn" />
            <Stat label="발주 필요" value={num(dash.summary.orderNeeded)} />
            <Stat label="미해결 알림" value={num(dash.summary.openAlerts)} tone="danger" />
          </div>

          <Card title={`${dash.institution.institutionName} — 재고 현황`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>품목 (표준코드)</Th>
                    <Th className="text-right">현재고</Th>
                    <Th className="text-right">가용</Th>
                    <Th className="text-right">ROP</Th>
                    <Th className="text-right">발주권고</Th>
                    <Th>공급위험</Th>
                    <Th>상태</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dash.inventory.map((r: any, i: number) => (
                    <tr key={i} className={r.status === "CRITICAL" ? "bg-red-50/40" : ""}>
                      <Td className="font-medium">
                        {r.standardName}
                        <span className="ml-1 font-mono text-xs text-slate-400">{r.standardCode}</span>
                      </Td>
                      <Td className="text-right">{num(r.onHand)}</Td>
                      <Td className="text-right font-semibold">{num(r.available)}</Td>
                      <Td className="text-right text-slate-500">{num(r.ROP)}</Td>
                      <Td className="text-right">
                        {r.orderRecommendation > 0 ? <span className="font-bold">{num(r.orderRecommendation)}</span> : <span className="text-slate-300">0</span>}
                      </Td>
                      <Td><RiskBadge level={r.supplyRiskLevel} /></Td>
                      <Td><StatusBadge status={r.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="관련 알림">
            {dash.alerts.length === 0 ? (
              <p className="text-sm text-slate-400">알림 없음</p>
            ) : (
              <ul className="space-y-2">
                {dash.alerts.map((a: any) => (
                  <li key={a.alertId} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                    <RiskBadge level={a.severity} />
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {a.title}
                        <span className="ml-2 text-xs font-normal text-slate-400">{ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}</span>
                      </div>
                      <div className="text-xs text-slate-500">{a.message}</div>
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
