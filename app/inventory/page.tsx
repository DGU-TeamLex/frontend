"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import {
  Card, Toolbar, Field, Select, TextInput, RiskBadge, StatusBadge,
  Td, State, SkeletonTable, EmptyState, PageTitle,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

// 정렬 순위 (범주형)
const RISK_RANK: Record<string, number> = { CRITICAL: 0, WARNING: 1, CAUTION: 2, NORMAL: 3 };
const STAT_RANK: Record<string, number> = { CRITICAL: 0, BELOW_ROP: 1, WATCH: 2, OK: 3 };
const RISK_OPTS: [string, string][] = [["", "전체"], ["CRITICAL", "심각"], ["WARNING", "경계"], ["CAUTION", "주의"], ["NORMAL", "정상"]];
const STATUS_OPTS: [string, string][] = [["", "전체"], ["CRITICAL", "긴급 부족"], ["BELOW_ROP", "재주문점 미달"], ["WATCH", "주의"], ["OK", "정상"]];
// 재고 0 원인 (ai#32) — 라벨/색. 실결품만 진짜 발주 대상, 나머지는 참고 표기.
// 재고0 원인 정렬 순위 — 조치 시급한 순(실제 결품 → 데이터 점검 → 미운영 → 해당없음)
const ZSR_RANK: Record<string, number> = { TRUE_STOCKOUT: 0, DATA_MISSING: 1, NOT_OPERATED: 2 };
const ZSR_OPTS: [string, string][] = [["", "전체"], ["TRUE_STOCKOUT", "실제 결품"], ["DATA_MISSING", "데이터 점검"], ["NOT_OPERATED", "미운영"]];
const ZERO_REASON: Record<string, { l: string; t: string; c: string }> = {
  TRUE_STOCKOUT: { l: "실제 결품", t: "출고 이력이 있고 재고 기록도 정상 — 소진 후 미보충. 실제 발주 대상.", c: "text-crit" },
  DATA_MISSING: { l: "데이터 점검", t: "재고가 없는데 출고가 발생(출고량 > 이전재고+입고). 재고 기재 누락 가능성.", c: "text-warn" },
  NOT_OPERATED: { l: "미운영", t: "전 기간 출고 이력이 없음 — 운영하지 않는 품목이라 발주 대상 아님.", c: "text-ink-faint" },
};

// 정렬 가능한 헤더 셀
function SortTh({ label, k, sortKey, dir, onSort, align = "left" }: {
  label: string; k: string; sortKey: string | null; dir: "asc" | "desc";
  onSort: (k: string) => void; align?: "left" | "right";
}) {
  const on = sortKey === k;
  return (
    <th
      onClick={() => onSort(k)}
      className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${on ? "text-accent-dark" : "text-ink-faint hover:text-ink-muted"} ${align === "right" ? "text-right" : "text-left"}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        <span className="text-[9px] leading-none opacity-70">{on ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </span>
    </th>
  );
}

function PolicyTable({ initInstitution }: { initInstitution: string }) {
  const [institution, setInstitution] = useState(initInstitution);
  const [status, setStatus] = useState("");          // 서버측 필터(전국 전체 기준)
  useEffect(() => setInstitution(initInstitution), [initInstitution]);

  // 컬럼별 클라이언트 필터 (불러온 목록 내에서 적용)
  const [fInst, setFInst] = useState("");
  const [fItem, setFItem] = useState("");
  const [fRisk, setFRisk] = useState("");
  const [fZsr, setFZsr] = useState("");   // 재고0 원인 필터
  const [fMin, setFMin] = useState<Record<string, string>>({});
  const [showNonMed, setShowNonMed] = useState(false);  // 비의료품(판촉·홍보물) 기본 숨김
  const [showFamCovered, setShowFamCovered] = useState(false);  // family에 재고 있는 '긴급부족' 오탐 기본 숨김
  const [showNotOperated, setShowNotOperated] = useState(false);  // 미운영(출고이력 전혀 없음) 재고0 기본 숨김
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const path = useMemo(() => {
    const qs = new URLSearchParams();
    if (institution) qs.set("institution", institution);
    if (status) qs.set("status", status);
    const q = qs.toString();
    return `/inventory-policy${q ? `?${q}` : ""}`;
  }, [institution, status]);
  const inv = useApi<any>(path);

  const rawItems: any[] = inv.data?.items ?? [];
  const instName = rawItems[0]?.institutionName;

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }
  const setMin = (k: string, v: string) => setFMin((m) => ({ ...m, [k]: v }));
  const minInput = (k: string) => (
    <input
      value={fMin[k] ?? ""}
      onChange={(e) => setMin(k, e.target.value)}
      placeholder="≥"
      inputMode="numeric"
      className="w-14 rounded border border-line bg-surface px-1.5 py-1 text-right text-xs tabular-nums text-ink outline-none focus:border-accent"
    />
  );

  const anyFilter = fInst || fItem || fRisk || fZsr || Object.values(fMin).some((v) => v !== "");

  const rows = useMemo(() => {
    let r = rawItems.filter((x) => {
      if (!showNonMed && x.isMedical === false) return false;  // 비의료품(색칠공부·약봉투·판촉물) 제외
      // 물품코드 분산 오탐(ai#33): 이 코드만 0이고 같은 기관·품목군엔 재고가 있으면 긴급부족이 아님
      if (!showFamCovered && x.status === "CRITICAL" && Number(x.familyAvailable ?? 0) > 0) return false;
      // 미운영(ai#32): 전 기간 출고이력이 없어 재고만 0인 품목 — 발주 대상 아님
      if (!showNotOperated && x.zeroStockReason === "NOT_OPERATED") return false;
      if (fInst && !`${x.institutionName ?? ""} ${x.sido ?? ""} ${x.sigungu ?? ""}`.toLowerCase().includes(fInst.toLowerCase())) return false;
      if (fItem && !`${x.standardName ?? ""} ${x.standardCode ?? ""}`.toLowerCase().includes(fItem.toLowerCase())) return false;
      if (fRisk && (x.supplyRiskLevel ?? "NORMAL") !== fRisk) return false;
      if (fZsr && x.zeroStockReason !== fZsr) return false;
      for (const [k, v] of Object.entries(fMin)) {
        if (v !== "" && Number(x[k] ?? 0) < Number(v)) return false;
      }
      return true;
    });
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      r = [...r].sort((a, b) => {
        if (sortKey === "supplyRiskLevel") return ((RISK_RANK[a.supplyRiskLevel] ?? 9) - (RISK_RANK[b.supplyRiskLevel] ?? 9)) * dir;
        if (sortKey === "status") return ((STAT_RANK[a.status] ?? 9) - (STAT_RANK[b.status] ?? 9)) * dir;
        if (sortKey === "zeroStockReason")
          return ((ZSR_RANK[a.zeroStockReason] ?? 9) - (ZSR_RANK[b.zeroStockReason] ?? 9)) * dir;
        if (sortKey === "institutionName" || sortKey === "standardName")
          return String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "ko") * dir;
        return (Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)) * dir;
      });
    }
    return r;
  }, [rawItems, fInst, fItem, fRisk, fMin, fZsr, sortKey, sortDir, showNonMed, showFamCovered, showNotOperated]);

  const nonMedCount = useMemo(() => rawItems.filter((x) => x.isMedical === false).length, [rawItems]);
  const notOperatedCount = useMemo(
    () => rawItems.filter((x) => x.zeroStockReason === "NOT_OPERATED").length,
    [rawItems],
  );
  const famCoveredCount = useMemo(
    () => rawItems.filter((x) => x.status === "CRITICAL" && Number(x.familyAvailable ?? 0) > 0).length,
    [rawItems],
  );

  return (
    <div>
      <Toolbar className="mb-4">
        <Field label="상태 (전국 조회)">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="min-w-[150px]">
            {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <label className="flex cursor-pointer select-none items-center gap-2 self-end rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-muted hover:text-ink">
          <input type="checkbox" checked={showNonMed} onChange={(e) => setShowNonMed(e.target.checked)} className="accent-accent" />
          비의료품 포함
          {nonMedCount > 0 && !showNonMed && <span className="text-xs text-ink-faint">({num(nonMedCount)}건 숨김)</span>}
        </label>
        <label
          className="flex cursor-pointer select-none items-center gap-2 self-end rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-muted hover:text-ink"
          title="같은 기관·같은 품목군에 재고가 남아 있는데 이 코드만 0이라 '긴급 부족'으로 뜨는 항목"
        >
          <input type="checkbox" checked={showFamCovered} onChange={(e) => setShowFamCovered(e.target.checked)} className="accent-accent" />
          품목군 재고보유분 포함
          {famCoveredCount > 0 && !showFamCovered && <span className="text-xs text-ink-faint">({num(famCoveredCount)}건 숨김)</span>}
        </label>
        <label
          className="flex cursor-pointer select-none items-center gap-2 self-end rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-muted hover:text-ink"
          title="전 기간 출고 이력이 없어 재고만 0인 품목 — 운영하지 않는 품목이라 발주 대상이 아님"
        >
          <input type="checkbox" checked={showNotOperated} onChange={(e) => setShowNotOperated(e.target.checked)} className="accent-accent" />
          미운영 품목 포함
          {notOperatedCount > 0 && !showNotOperated && <span className="text-xs text-ink-faint">({num(notOperatedCount)}건 숨김)</span>}
        </label>
        {institution && (
          <button
            onClick={() => setInstitution("")}
            className="flex items-center gap-1.5 self-end rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink-muted hover:text-crit"
          >
            <span className="font-medium text-ink">{instName ?? "선택 기관"}</span> ✕
          </button>
        )}
        {anyFilter && (
          <button
            onClick={() => { setFInst(""); setFItem(""); setFRisk(""); setFZsr(""); setFMin({}); }}
            className="self-end rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
          >
            컬럼 필터 초기화
          </button>
        )}
      </Toolbar>

      <Card bodyClassName="p-0">
        {inv.loading && <div className="p-4"><SkeletonTable cols={8} rows={12} /></div>}
        {inv.error && <div className="p-5"><State loading={false} error={inv.error} /></div>}
        {inv.data && rawItems.length === 0 && (
          <EmptyState title="해당 조건의 재고가 없습니다" desc="상태 필터를 바꿔보세요." />
        )}
        {rawItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  {!institution && <SortTh label="기관" k="institutionName" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />}
                  <SortTh label="품목" k="standardName" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortTh label="현재고" k="onHand" sortKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortTh label="가용" k="available" sortKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortTh label="SS" k="SS" sortKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortTh label="ROP" k="ROP" sortKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortTh label="발주권고" k="orderRecommendation" sortKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortTh label="위험" k="supplyRiskLevel" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortTh label="상태" k="status" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortTh label="원인" k="zeroStockReason" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                </tr>
                {/* 컬럼별 필터 행 */}
                <tr className="border-b border-line bg-paper/50">
                  {!institution && (
                    <th className="px-2 pb-2 pt-1 align-top">
                      <TextInput value={fInst} onChange={(e) => setFInst(e.target.value)} placeholder="기관·지역" className="w-full min-w-[110px] !py-1 !text-xs" />
                    </th>
                  )}
                  <th className="px-2 pb-2 pt-1 align-top">
                    <TextInput value={fItem} onChange={(e) => setFItem(e.target.value)} placeholder="품목·코드" className="w-full min-w-[120px] !py-1 !text-xs" />
                  </th>
                  <th className="px-2 pb-2 pt-1 text-right align-top">{minInput("onHand")}</th>
                  <th className="px-2 pb-2 pt-1 text-right align-top">{minInput("available")}</th>
                  <th className="px-2 pb-2 pt-1 text-right align-top">{minInput("SS")}</th>
                  <th className="px-2 pb-2 pt-1 text-right align-top">{minInput("ROP")}</th>
                  <th className="px-2 pb-2 pt-1 text-right align-top">{minInput("orderRecommendation")}</th>
                  <th className="px-2 pb-2 pt-1 align-top">
                    <select value={fRisk} onChange={(e) => setFRisk(e.target.value)} className="w-full min-w-[76px] rounded border border-line bg-surface px-1.5 py-1 text-xs text-ink outline-none focus:border-accent">
                      {RISK_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </th>
                  <th className="px-2 pb-2 pt-1 align-top" />
                  <th className="px-2 pb-2 pt-1 align-top">
                    <select value={fZsr} onChange={(e) => setFZsr(e.target.value)} className="w-full min-w-[86px] rounded border border-line bg-surface px-1.5 py-1 text-xs text-ink outline-none focus:border-accent">
                      {ZSR_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, i) => (
                  <tr key={i} className={`transition-colors hover:bg-paper ${r.status === "CRITICAL" ? "bg-crit-soft/30" : ""}`}>
                    {!institution && (
                      <Td className="max-w-[160px]">
                        <span className="block truncate text-ink-muted">{r.institutionName}</span>
                        <span className="block truncate text-xs text-ink-faint">{r.sido} {r.sigungu}</span>
                      </Td>
                    )}
                    <Td className="max-w-[220px]">
                      <span className="block truncate font-medium text-ink">{r.standardName}</span>
                      <span className="font-mono text-xs text-ink-faint">{r.standardCode}</span>
                    </Td>
                    <Td className="text-right">{num(r.onHand)}</Td>
                    <Td className="text-right font-semibold">{num(r.available)}</Td>
                    <Td className="text-right text-ink-muted">{num(r.SS)}</Td>
                    <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                    <Td className="text-right">{r.orderRecommendation > 0 ? <span className="font-bold text-accent-dark">{num(r.orderRecommendation)}</span> : <span className="text-ink-faint">0</span>}</Td>
                    <Td>{r.supplyRiskLevel && r.supplyRiskLevel !== "NORMAL" ? <RiskBadge level={r.supplyRiskLevel} /> : <span className="text-xs text-ink-faint">정상</span>}</Td>
                    <Td>
                      <StatusBadge status={r.status} />
                      {/* 코드 분산 오탐 표기: 이 코드는 0이어도 같은 기관 품목군엔 재고가 있음 */}
                      {r.status === "CRITICAL" && Number(r.familyAvailable ?? 0) > 0 && (
                        <span className="mt-0.5 block text-[11px] leading-tight text-ink-faint">
                          품목군 보유 {num(r.familyAvailable)}
                          {r.familyCodes > 1 && ` · 코드 ${r.familyCodes}개`}
                        </span>
                      )}
                    </Td>
                    {/* 재고 0 원인(ai#32) — 정렬 시 실제결품 → 데이터점검 → 미운영 순 */}
                    <Td>
                      {ZERO_REASON[r.zeroStockReason] ? (
                        <span
                          className={`cursor-help whitespace-nowrap text-xs ${ZERO_REASON[r.zeroStockReason].c}`}
                          title={ZERO_REASON[r.zeroStockReason].t}
                        >
                          {ZERO_REASON[r.zeroStockReason].l}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={10} className="px-5 py-10 text-center text-sm text-ink-faint">컬럼 필터에 맞는 행이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {inv.data?.totalElements > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs text-ink-faint">
            <span>{institution ? `${instName} · ` : "전국 시급도순 · "}총 {num(inv.data.totalElements)}건{!institution && inv.data.totalElements >= 500 ? " 중 상위 500건" : ""}</span>
            <span>{rows.length !== rawItems.length ? `${num(rows.length)}건 표시 (불러온 ${num(rawItems.length)}건 중${!showNonMed && nonMedCount > 0 ? `, 비의료 ${num(nonMedCount)} 제외` : ""})` : `${num(rawItems.length)}건 표시`}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

function InventoryInner() {
  const params = useSearchParams();
  const urlInstitution = params.get("institution") ?? "";
  return (
    <div>
      <PageTitle
        title="재고·발주"
        desc="전국 재고정책(SS·ROP·발주권고) 표. 각 컬럼에서 검색·최소값·레벨로 필터하고, 헤더를 눌러 정렬합니다."
      />
      <PolicyTable initInstitution={urlInstitution} />
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <Suspense fallback={<div className="text-sm text-ink-faint">불러오는 중…</div>}>
        <InventoryInner />
      </Suspense>
    </RequireRole>
  );
}
