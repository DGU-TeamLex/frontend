"use client";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import { Card, Th, Td, State, PageTitle } from "../components/ui";

const IMPORT_STATUS: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  LOADING: "bg-blue-100 text-blue-700",
  VALIDATING: "bg-amber-100 text-amber-700",
  VALIDATION_FAILED: "bg-red-100 text-red-700",
};
const STD_STATUS: Record<string, string> = {
  AUTO_ACCEPT: "bg-emerald-100 text-emerald-700",
  NEEDS_REVIEW: "bg-amber-100 text-amber-700",
  NO_MATCH: "bg-red-100 text-red-700",
};

export default function ImportsPage() {
  const imports = useApi<any>("/imports");
  const queue = useApi<any>("/standardization/queue");
  const indicators = useApi<any>("/external-indicators");

  return (
    <div className="space-y-6">
      <PageTitle
        title="데이터 인테이크 & 표준화"
        desc="가명처리 XLSX 업로드 → 스키마·품질 검증 → 멱등 적재 → 표준품목 매핑(모듈 A). PHIS 직접연동 없이 파일 기반."
      />

      <Card title="적재 배치 (import_batch)">
        <State loading={imports.loading} error={imports.error} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>배치 ID</Th>
                <Th>파일</Th>
                <Th>기간</Th>
                <Th className="text-right">총 행</Th>
                <Th className="text-right">오류</Th>
                <Th className="text-right">매핑률</Th>
                <Th>상태</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {imports.data?.items?.map((b: any) => (
                <tr key={b.importBatchId}>
                  <Td className="font-mono text-xs">{b.importBatchId}</Td>
                  <Td className="font-medium">{b.fileName}</Td>
                  <Td className="text-xs text-slate-500">{b.periodStart} ~ {b.periodEnd}</Td>
                  <Td className="text-right">{num(b.totalRows)}</Td>
                  <Td className="text-right text-orange-600">{num(b.errorRows)}</Td>
                  <Td className="text-right">{Math.round(b.mappingRate * 100)}%</Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${IMPORT_STATUS[b.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {b.status}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="표준화 검수 큐 (모듈 A)">
          <State loading={queue.loading} error={queue.error} />
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>원천 물품명</Th>
                <Th>추천 표준품목</Th>
                <Th className="text-right">점수</Th>
                <Th>상태</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.data?.items?.map((q: any) => (
                <tr key={q.rawItemId}>
                  <Td className="font-medium">{q.rawName}</Td>
                  <Td className="text-slate-600">
                    {q.topCandidate ? `${q.topCandidate.standardName} (${q.topCandidate.standardCode})` : <span className="text-slate-400">후보 없음</span>}
                  </Td>
                  <Td className="text-right">{q.topCandidate ? Math.round(q.topCandidate.score * 100) + "%" : "-"}</Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STD_STATUS[q.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {q.status}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="외부지표 최신성 (모듈 C 입력)">
          <State loading={indicators.loading} error={indicators.error} />
          <div className="space-y-4">
            {indicators.data?.items?.map((ind: any) => {
              const last = ind.latest[ind.latest.length - 1];
              const prev = ind.latest[ind.latest.length - 2];
              const up = prev && last.value > prev.value;
              return (
                <div key={ind.indicatorId} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{ind.indicatorType}</div>
                    <div className="text-xs text-slate-400">{ind.sourceSystem} · {ind.granularity} · 최신 {last.observedAt}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-slate-900">
                      {num(last.value)} <span className="text-xs font-normal text-slate-400">{ind.unit}</span>
                    </div>
                    {prev && (
                      <div className={`text-xs ${up ? "text-red-600" : "text-emerald-600"}`}>
                        {up ? "▲" : "▼"} {num(Math.abs(last.value - prev.value))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
