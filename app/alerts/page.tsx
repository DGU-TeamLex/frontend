"use client";
import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { ALERT_TYPE_LABEL } from "../lib/format";
import {
  Card, RiskBadge, Th, Td, State, PageTitle, SkeletonTable, EmptyState,
  Tabs, Toolbar, Field, Select, Stat, SkeletonStatGrid,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

/**
 * 알림 화면 (frontend#40)
 *
 * 부족 현황은 저장 테이블(`/alerts`)이 아니라 실재고 파생 API(`/alerts/derived`)에서 읽는다.
 * `alerts` 테이블은 2026-07-10 시드된 30건 스냅샷이라 실제 부족 규모(약 22만 건)를
 * 전혀 대표하지 못했다. 저장 테이블은 사람이 처리상태(승인·해소)를 관리하는 용도로
 * 남아 있으므로, 두 성격을 탭으로 분리해 화면에서도 구분한다.
 */

const PAGE_SIZE = 50;

function nf(n: unknown) {
  return typeof n === "number" ? n.toLocaleString() : ((n as string) ?? "-");
}

/** 부족 현황 — 실재고에서 조회 시점에 파생 */
function ShortageView() {
  const [status, setStatus] = useState("");
  const [perInstitution, setPerInstitution] = useState("5");
  const [limit, setLimit] = useState("500");
  const [page, setPage] = useState(0);

  const qs = new URLSearchParams({ per_institution: perInstitution, limit });
  if (status) qs.set("status", status);

  const { data, loading, error } = useApi<any>(`/alerts/derived?${qs.toString()}`);
  const summary = useApi<any>("/alerts/derived/summary");

  const rows = data?.items ?? [];
  const pageRows = useMemo(
    () => rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [rows, page],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const byStatus = summary.data?.byStatus ?? {};
  const crit = byStatus.CRITICAL ?? {};
  const below = byStatus.BELOW_ROP ?? {};

  return (
    <div className="space-y-4">
      {/* 실제 규모 — 조회 창(limit)과 무관한 전체 집계 */}
      {summary.loading && <SkeletonStatGrid count={3} />}
      {summary.data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="전체 재고미달"
            value={nf(summary.data.totalShortage)}
            sub="실재고 기준 · 사장재고(DORMANT) 제외"
          />
          <Stat
            label="긴급부족 (CRITICAL)"
            value={nf(crit.count)}
            sub={`기관 ${nf(crit.institutions)} · 품목 ${nf(crit.items)}`}
            tone="danger"
          />
          <Stat
            label="재주문점 미달 (BELOW_ROP)"
            value={nf(below.count)}
            sub={`기관 ${nf(below.institutions)} · 품목 ${nf(below.items)}`}
            tone="warn"
          />
        </div>
      )}

      <Toolbar>
        <Field label="상태">
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          >
            <option value="">전체</option>
            <option value="CRITICAL">긴급부족</option>
            <option value="BELOW_ROP">재주문점 미달</option>
          </Select>
        </Field>
        <Field label="기관당 상위">
          <Select
            value={perInstitution}
            onChange={(e) => { setPerInstitution(e.target.value); setPage(0); }}
          >
            {["3", "5", "10", "20", "50"].map((v) => (
              <option key={v} value={v}>{v}건</option>
            ))}
          </Select>
        </Field>
        <Field label="조회 건수">
          <Select
            value={limit}
            onChange={(e) => { setLimit(e.target.value); setPage(0); }}
          >
            {["200", "500", "1000", "2000"].map((v) => (
              <option key={v} value={v}>{Number(v).toLocaleString()}건</option>
            ))}
          </Select>
        </Field>
      </Toolbar>

      {error && <State loading={false} error={error} />}
      {loading && (
        <Card title="부족 현황">
          <SkeletonTable cols={7} rows={8} />
        </Card>
      )}

      {data && (
        <Card
          title={`부족 현황 (조회 ${nf(rows.length)}건${
            summary.data ? ` / 전체 ${nf(summary.data.totalShortage)}건` : ""
          })`}
        >
          <p className="mb-3 text-xs text-ink-faint">
            전체 부족은 22만 건 규모라 모두 나열하지 않는다. 기관당 시급도 상위 {perInstitution}건으로
            추린 뒤 최대 {Number(limit).toLocaleString()}건까지 조회한다. 위 카드의 집계는 조회 창과
            무관한 전체 규모다.
          </p>
          {rows.length === 0 ? (
            <EmptyState title="부족 품목이 없습니다" desc="조건에 해당하는 재고미달이 없습니다." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <Th>심각도</Th>
                      <Th>품목</Th>
                      <Th>기관</Th>
                      <Th className="text-right">가용</Th>
                      <Th className="text-right">재주문점</Th>
                      <Th className="text-right">부족분</Th>
                      <Th className="text-right">발주권고</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {pageRows.map((a: any) => (
                      <tr key={a.alertId}>
                        <Td><RiskBadge level={a.severity} /></Td>
                        <Td className="font-medium">
                          {a.standardName}
                          <div className="text-xs font-normal text-ink-faint">
                            {a.standardCode} · {ALERT_TYPE_LABEL[a.alertType] ?? a.alertType}
                          </div>
                        </Td>
                        <Td>
                          {a.institutionName}
                          <div className="text-xs text-ink-faint">
                            {[a.sido, a.sigungu].filter(Boolean).join(" ")}
                          </div>
                        </Td>
                        <Td className="text-right tabular-nums">{nf(a.evidence?.available)}</Td>
                        <Td className="text-right tabular-nums">{nf(a.evidence?.ROP)}</Td>
                        <Td className="text-right font-semibold tabular-nums text-crit">
                          {nf(a.evidence?.shortageGap)}
                        </Td>
                        <Td className="text-right tabular-nums">{nf(a.evidence?.orderRecommendation)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-ink-faint tabular-nums">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} / {nf(rows.length)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-ink-muted shadow-card disabled:opacity-40"
                  >
                    이전
                  </button>
                  <span className="px-1 py-1.5 text-ink-muted tabular-nums">
                    {page + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-ink-muted shadow-card disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

/** 처리 관리 — 사람이 승인·해소 이력을 남기는 저장 테이블 */
function ManagedView() {
  const { data, loading, error } = useApi<any>("/alerts");
  const rows = data?.items ?? [];

  return (
    <div className="space-y-4">
      {error && <State loading={false} error={error} />}
      {loading && (
        <Card title="처리 관리">
          <SkeletonTable cols={6} rows={8} />
        </Card>
      )}
      {data && (
        <Card title={`처리 관리 (미해결 ${rows.filter((a: any) => !a.resolvedAt).length} / 전체 ${rows.length})`}>
          <p className="mb-3 text-xs text-ink-faint">
            사람이 처리상태를 관리하는 알림이다. 현재 재고 부족 현황은 &lsquo;부족 현황&rsquo; 탭에서 확인한다.
          </p>
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

function Alerts() {
  const [tab, setTab] = useState("shortage");

  return (
    <div className="space-y-4">
      <PageTitle
        title="알림"
        desc="재고 부족 현황은 실재고에서 조회 시점에 파생한다. 처리상태 관리가 필요한 알림은 별도 탭에서 다룬다."
      />
      <Tabs
        tabs={[
          { key: "shortage", label: "부족 현황" },
          { key: "managed", label: "처리 관리" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "shortage" ? <ShortageView /> : <ManagedView />}
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
