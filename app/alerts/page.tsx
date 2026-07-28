"use client";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import {
  Card, SectionHeader, Stat, Toolbar, Field, Select, TextInput,
  RiskBadge, StatusBadge, Th, Td, State, PageTitle,
  SkeletonTable, SkeletonStatGrid, EmptyState,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

const STATUS_OPTS: [string, string][] = [
  ["", "전체"],
  ["CRITICAL", "긴급 부족"],
  ["BELOW_ROP", "재주문점 미달"],
];
const LIMIT_OPTS = [100, 200, 500, 1000];
const PAGE_SIZE = 50; // 클라이언트 "더 보기" 표시 단위

function Alerts() {
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(200);
  const [instQuery, setInstQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // 실재고 기반 파생 부족 목록 — 기관당 상위 N건으로 서버측 cap (per_institution 기본값 사용)
  const listPath = useMemo(() => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    qs.set("limit", String(limit));
    const q = qs.toString();
    return `/alerts/derived${q ? `?${q}` : ""}`;
  }, [status, limit]);

  const { data, loading, error } = useApi<any>(listPath);
  // 실제 부족 규모(DB 전체 집계) — cap 없이 CRITICAL/BELOW_ROP 진짜 건수
  const summary = useApi<any>("/alerts/derived/summary");

  const rawItems: any[] = data?.items ?? [];
  const rows = useMemo(() => {
    if (!instQuery) return rawItems;
    const q = instQuery.toLowerCase();
    return rawItems.filter((r) =>
      `${r.institution_name ?? ""} ${r.sido ?? ""} ${r.sigungu ?? ""}`.toLowerCase().includes(q),
    );
  }, [rawItems, instQuery]);

  // 필터가 바뀌면 "더 보기" 진행 상태 초기화
  useEffect(() => setVisible(PAGE_SIZE), [listPath, instQuery]);

  const critSummary = summary.data?.byStatus?.CRITICAL;
  const belowRopSummary = summary.data?.byStatus?.BELOW_ROP;

  return (
    <div>
      <PageTitle
        title="알림 (실재고 기준 부족 현황)"
        desc="실재고 기반 온디맨드 파생 API(/alerts/derived)로 현재 부족 현황을 조회합니다. 처리상태(담당자 확인·해제) 관리는 별도의 alerts 데이터에서 이루어지며, 이 화면은 조회 전용입니다."
      />

      {/* 실제 규모 — DB 전체 집계(cap 없음). 아래 목록과 건수가 다른 것이 정상입니다. */}
      <div className="mb-6">
        <SectionHeader
          title="실제 부족 규모 (DB 전체 집계)"
          desc="기관별 상위 N건으로 제한되는 아래 목록과 달리, cap 없는 실제 건수입니다."
        />
        {summary.loading && <SkeletonStatGrid count={4} />}
        {summary.error && (
          <Card><State loading={false} error={summary.error} /></Card>
        )}
        {summary.data && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="전체 부족 (실제 규모)"
              value={num(summary.data.totalShortage)}
              tone="danger"
              sub="CRITICAL + BELOW_ROP 합계"
            />
            <Stat
              label="긴급 부족 (CRITICAL)"
              value={num(critSummary?.count)}
              tone="danger"
              sub={`기관 ${num(critSummary?.institutions)} · 품목 ${num(critSummary?.items)}`}
            />
            <Stat
              label="재주문점 미달 (BELOW_ROP)"
              value={num(belowRopSummary?.count)}
              tone="warn"
              sub={`기관 ${num(belowRopSummary?.institutions)} · 품목 ${num(belowRopSummary?.items)}`}
            />
            <Stat
              label="아래 목록에 표시된 건수"
              value={num(rawItems.length)}
              sub={`기관당 상위 N건으로 제한된 화면 표시용 (limit=${limit})`}
            />
          </div>
        )}
      </div>

      {/* 목록 필터 */}
      <Toolbar className="mb-4">
        <Field label="상태">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="min-w-[150px]">
            {STATUS_OPTS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="기관·지역 검색">
          <TextInput
            value={instQuery}
            onChange={(e) => setInstQuery(e.target.value)}
            placeholder="기관명·시도·시군구"
            className="min-w-[180px]"
          />
        </Field>
        <Field label="서버에서 불러올 건수">
          <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} className="min-w-[110px]">
            {LIMIT_OPTS.map((v) => (
              <option key={v} value={v}>{v}건</option>
            ))}
          </Select>
        </Field>
      </Toolbar>

      <Card
        title={`부족 현황 목록 (표시 ${num(Math.min(visible, rows.length))} / 불러옴 ${num(rows.length)}건)`}
        bodyClassName="p-0"
      >
        {error && <div className="p-5"><State loading={false} error={error} /></div>}
        {loading && <div className="p-4"><SkeletonTable cols={9} rows={10} /></div>}
        {data && rows.length === 0 && (
          <EmptyState title="해당 조건의 부족 항목이 없습니다" desc="상태·검색 필터를 조정해 보세요." />
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>기관</Th>
                  <Th>품목</Th>
                  <Th>상태</Th>
                  <Th>위험</Th>
                  <Th className="text-right">현재고</Th>
                  <Th className="text-right">가용</Th>
                  <Th className="text-right">SS</Th>
                  <Th className="text-right">ROP</Th>
                  <Th className="text-right">부족분</Th>
                  <Th className="text-right">발주권고</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.slice(0, visible).map((r: any, i: number) => (
                  <tr
                    key={`${r.institution_id}-${r.standard_code}-${i}`}
                    className={`transition-colors hover:bg-paper ${r.status === "CRITICAL" ? "bg-crit-soft/30" : ""}`}
                  >
                    <Td className="max-w-[160px]">
                      <span className="block truncate text-ink-muted">{r.institution_name}</span>
                      <span className="block truncate text-xs text-ink-faint">{r.sido} {r.sigungu}</span>
                    </Td>
                    <Td className="max-w-[220px]">
                      <span className="block truncate font-medium text-ink">{r.standard_name}</span>
                      <span className="font-mono text-xs text-ink-faint">{r.standard_code}</span>
                    </Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td>
                      {r.supply_risk_level && r.supply_risk_level !== "NORMAL" ? (
                        <RiskBadge level={r.supply_risk_level} />
                      ) : (
                        <span className="text-xs text-ink-faint">정상</span>
                      )}
                    </Td>
                    <Td className="text-right">{num(r.on_hand)}</Td>
                    <Td className="text-right font-semibold">{num(r.available)}</Td>
                    <Td className="text-right text-ink-muted">{num(r.ss)}</Td>
                    <Td className="text-right text-ink-muted">{num(r.rop)}</Td>
                    <Td className="text-right font-bold text-crit">{num(r.shortage_gap)}</Td>
                    <Td className="text-right">
                      {r.order_recommendation > 0 ? (
                        <span className="font-bold text-accent-dark">{num(r.order_recommendation)}</span>
                      ) : (
                        <span className="text-ink-faint">0</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > visible && (
          <div className="border-t border-line px-5 py-3 text-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            >
              {num(Math.min(PAGE_SIZE, rows.length - visible))}건 더 보기
            </button>
          </div>
        )}
        {data && (
          <div className="border-t border-line px-5 py-3 text-xs leading-relaxed text-ink-faint">
            {data.note ?? "이 목록은 기관별 긴급도 상위 항목으로 제한(cap)된 화면입니다. 실제 부족 규모는 위 \"실제 부족 규모\" 카드를 기준으로 확인하세요."}
            {" "}이번 응답 항목 수 {num(data.totalElements)}건.
            처리상태(담당자 확인·해제) 관리는 별도의 alerts 데이터에서 이루어지며, 이 화면에는 표시되지 않습니다.
          </div>
        )}
      </Card>
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
