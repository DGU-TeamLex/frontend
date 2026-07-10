"use client";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import { Card, Th, Td, State, PageTitle, SkeletonTable, SkeletonList, EmptyState, MockBanner } from "../components/ui";
import RequireRole from "../components/RequireRole";

const IMPORT_STATUS: Record<string, string> = {
  COMPLETED: "bg-ok-soft text-ok",
  LOADING: "bg-accent-soft text-accent-dark",
  VALIDATING: "bg-caution-soft text-caution",
  VALIDATION_FAILED: "bg-crit-soft text-crit",
};
const STD_STATUS: Record<string, string> = {
  AUTO_ACCEPT: "bg-ok-soft text-ok",
  NEEDS_REVIEW: "bg-caution-soft text-caution",
  NO_MATCH: "bg-crit-soft text-crit",
};

function Imports() {
  const imports = useApi<any>("/imports");
  const queue = useApi<any>("/standardization/queue");
  const indicators = useApi<any>("/external-indicators");

  return (
    <div className="space-y-6">
      <PageTitle
        title="데이터 인테이크 & 표준화"
        desc="가명처리 XLSX 업로드 → 스키마·품질 검증 → 멱등 적재 → 표준품목 매핑(모듈 A). PHIS 직접연동 없이 파일 기반."
      />

      <Card
        title="적재 배치 (import_batch)"
        action={<span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">실데이터</span>}
      >
        {imports.error && <State loading={false} error={imports.error} />}
        {imports.loading && <SkeletonTable cols={7} rows={4} />}
        {imports.data && imports.data.items.length === 0 && (
          <EmptyState title="적재 배치가 없습니다" desc="업로드된 XLSX 배치가 아직 없습니다." />
        )}
        {imports.data && imports.data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>배치 ID</Th>
                  <Th>파일</Th>
                  <Th>기간</Th>
                  <Th className="text-right">총 행</Th>
                  <Th className="text-right">오류</Th>
                  <Th className="text-right">매핑률</Th>
                  <Th>상태</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {imports.data.items.map((b: any) => (
                  <tr key={b.importBatchId}>
                    <Td className="font-mono text-xs">{b.importBatchId}</Td>
                    <Td className="font-medium">{b.fileName}</Td>
                    <Td className="text-xs text-ink-muted">{b.periodStart} ~ {b.periodEnd}</Td>
                    <Td className="text-right">{num(b.totalRows)}</Td>
                    <Td className="text-right text-warn">{num(b.errorRows)}</Td>
                    <Td className="text-right">{Math.round(b.mappingRate * 100)}%</Td>
                    <Td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${IMPORT_STATUS[b.status] ?? "bg-paper text-ink-muted"}`}>
                        {b.status}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="표준화 검수 큐 (모듈 A)">
          <MockBanner reason="자유텍스트→표준코드 매칭 엔진 미구현 — 고정된 시연용 값입니다." />
          {queue.error && <State loading={false} error={queue.error} />}
          {queue.loading && <SkeletonTable cols={4} rows={5} />}
          {queue.data && queue.data.items.length === 0 && <EmptyState title="검수 대기 항목이 없습니다" />}
          {queue.data && queue.data.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <Th>원천 물품명</Th>
                    <Th>추천 표준품목</Th>
                    <Th className="text-right">점수</Th>
                    <Th>상태</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {queue.data.items.map((q: any) => (
                    <tr key={q.rawItemId}>
                      <Td className="font-medium">{q.rawName}</Td>
                      <Td className="text-ink-muted">
                        {q.topCandidate ? `${q.topCandidate.standardName} (${q.topCandidate.standardCode})` : <span className="text-ink-faint">후보 없음</span>}
                      </Td>
                      <Td className="text-right">{q.topCandidate ? Math.round(q.topCandidate.score * 100) + "%" : "-"}</Td>
                      <Td>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STD_STATUS[q.status] ?? "bg-paper text-ink-muted"}`}>
                          {q.status}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="외부지표 최신성 (모듈 C 입력)">
          <MockBanner reason="원자재 가격·뉴스지수 외부 API 연동 전 — 고정된 시연용 값입니다." />
          {indicators.error && <State loading={false} error={indicators.error} />}
          {indicators.loading && <SkeletonList rows={4} />}
          {indicators.data && indicators.data.items.length === 0 && <EmptyState title="외부지표가 없습니다" />}
          <div className="space-y-4">
            {indicators.data?.items?.map((ind: any) => {
              const last = ind.latest[ind.latest.length - 1];
              const prev = ind.latest[ind.latest.length - 2];
              const up = prev && last.value > prev.value;
              return (
                <div key={ind.indicatorId} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink">{ind.indicatorType}</div>
                    <div className="text-xs text-ink-faint">{ind.sourceSystem} · {ind.granularity} · 최신 {last.observedAt}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums text-ink">
                      {num(last.value)} <span className="text-xs font-normal text-ink-faint">{ind.unit}</span>
                    </div>
                    {prev && (
                      <div className={`text-xs tabular-nums ${up ? "text-crit" : "text-ok"}`}>
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

export default function ImportsPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <Imports />
    </RequireRole>
  );
}
