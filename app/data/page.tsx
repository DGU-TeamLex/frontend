"use client";
import { useMemo, useRef, useState } from "react";
import { API_BASE, useApi } from "../lib/api";
import { getStoredToken } from "../lib/auth-context";
import { num } from "../lib/format";
import {
  Card, Th, Td, State, PageTitle, SkeletonTable, SkeletonList, EmptyState, MockBanner,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

const IMPORT_STATUS: Record<string, string> = {
  RECEIVED: "bg-accent-soft text-accent-dark",
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

function UploadCard({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [vendor, setVendor] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg({ ok: false, text: "업로드할 .xlsx 파일을 선택하세요." }); return; }
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (vendor) fd.append("sourceVendor", vendor);
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/imports`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.detail ?? `업로드 실패 (HTTP ${res.status})`);
      setMsg({ ok: true, text: `접수 완료 · 배치 ${body?.importBatch?.importBatchId ?? ""}` });
      if (fileRef.current) fileRef.current.value = "";
      setVendor("");
      onDone();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message ?? "업로드 실패" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="XLSX 업로드">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">가명처리 XLSX 파일</span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-card file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">공급처(선택)</span>
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="예: OO의약품"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-card placeholder:text-ink-faint"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-card transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {busy ? "업로드 중…" : "업로드"}
        </button>
      </form>
      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-ok" : "text-crit"}`}>{msg.text}</p>
      )}
      <p className="mt-3 text-xs text-ink-faint">
        PHIS 직접연동 없이 파일 기반 인테이크(모듈 A). 업로드 시 스키마·품질 검증 후 멱등 적재됩니다.
      </p>
    </Card>
  );
}

function DataIntake() {
  const [reload, setReload] = useState(0);
  const importsPath = useMemo(() => `/imports?_r=${reload}`, [reload]);
  const imports = useApi<any>(importsPath);
  const queue = useApi<any>("/standardization/queue");
  const indicators = useApi<any>("/external-indicators");

  return (
    <div className="space-y-6">
      <PageTitle
        title="데이터"
        desc="가명처리 XLSX 업로드 → 스키마·품질 검증 → 멱등 적재 → 표준품목 매핑(모듈 A). PHIS 직접연동 없이 파일 기반."
      />

      <UploadCard onDone={() => setReload((n) => n + 1)} />

      <Card
        title="적재 배치 이력"
        action={<span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">실데이터</span>}
      >
        {imports.error && <State loading={false} error={imports.error} />}
        {imports.loading && <SkeletonTable cols={7} rows={4} />}
        {imports.data && imports.data.items.length === 0 && (
          <EmptyState title="적재 배치가 없습니다" desc="위에서 XLSX를 업로드하면 배치가 생성됩니다." />
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
                  <tr key={b.importBatchId} className="transition-colors hover:bg-paper">
                    <Td className="font-mono text-xs">{b.importBatchId}</Td>
                    <Td className="max-w-[200px] truncate font-medium">{b.fileName}</Td>
                    <Td className="text-xs text-ink-muted">{b.periodStart && b.periodEnd ? `${b.periodStart} ~ ${b.periodEnd}` : "—"}</Td>
                    <Td className="text-right">{num(b.totalRows)}</Td>
                    <Td className="text-right text-warn">{num(b.errorRows)}</Td>
                    <Td className="text-right">{Math.round((b.mappingRate ?? 0) * 100)}%</Td>
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
                    <Th>원천 물품명</Th><Th>추천 표준품목</Th><Th className="text-right">점수</Th><Th>상태</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {queue.data.items.map((q: any) => (
                    <tr key={q.rawItemId}>
                      <Td className="font-medium">{q.rawName}</Td>
                      <Td className="text-ink-muted">{q.topCandidate ? `${q.topCandidate.standardName} (${q.topCandidate.standardCode})` : <span className="text-ink-faint">후보 없음</span>}</Td>
                      <Td className="text-right">{q.topCandidate ? Math.round(q.topCandidate.score * 100) + "%" : "-"}</Td>
                      <Td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STD_STATUS[q.status] ?? "bg-paper text-ink-muted"}`}>{q.status}</span></Td>
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
                    <div className="font-mono text-sm font-semibold tabular-nums text-ink">{num(last.value)} <span className="text-xs font-normal text-ink-faint">{ind.unit}</span></div>
                    {prev && <div className={`text-xs tabular-nums ${up ? "text-crit" : "text-ok"}`}>{up ? "▲" : "▼"} {num(Math.abs(last.value - prev.value))}</div>}
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

export default function DataPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <DataIntake />
    </RequireRole>
  );
}
