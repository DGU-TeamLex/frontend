"use client";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "../lib/api";
import { num, RISK_LABEL, STATUS_LABEL } from "../lib/format";
import {
  Card, Toolbar, Field, Select, TextInput, RiskBadge, StatusBadge,
  Td, State, SkeletonTable, EmptyState, PageTitle,
} from "../components/ui";
import DepletionChart from "../components/DepletionChart";
import RequireRole from "../components/RequireRole";

// 정렬 순위 (범주형)
const RISK_RANK: Record<string, number> = { CRITICAL: 0, WARNING: 1, CAUTION: 2, NORMAL: 3 };
// EXCLUDED(판정 제외)는 경보가 아니므로 정렬에서 정상(OK)보다도 뒤에 둔다.
const STAT_RANK: Record<string, number> = { CRITICAL: 0, BELOW_ROP: 1, WATCH: 2, OK: 3, EXCLUDED: 4 };
const RISK_OPTS: [string, string][] = [["", "전체"], ["CRITICAL", "심각"], ["WARNING", "경계"], ["CAUTION", "주의"], ["NORMAL", "정상"]];
const STATUS_OPTS: [string, string][] = [["", "전체"], ["CRITICAL", "긴급 부족"], ["BELOW_ROP", "재주문점 미달"], ["WATCH", "주의"], ["OK", "정상"], ["EXCLUDED", "판정 제외"]];
// 재고 0 원인 (ai#32) — 라벨/색. 실결품만 진짜 발주 대상, 나머지는 참고 표기.
// 재고0 원인 정렬 순위 — 조치 시급한 순(실제 결품 → 데이터 점검 → 미운영 → 해당없음)
const ZSR_RANK: Record<string, number> = { TRUE_STOCKOUT: 0, DATA_MISSING: 1, NOT_OPERATED: 2 };
const ZSR_OPTS: [string, string][] = [["", "전체"], ["TRUE_STOCKOUT", "실제 결품"], ["DATA_MISSING", "데이터 점검"], ["NOT_OPERATED", "미운영"]];
const ZERO_REASON: Record<string, { l: string; t: string; c: string }> = {
  TRUE_STOCKOUT: { l: "실제 결품", t: "출고 이력이 있고 재고 기록도 정상 — 소진 후 미보충. 실제 발주 대상.", c: "text-crit" },
  DATA_MISSING: { l: "데이터 점검", t: "재고가 없는데 출고가 발생(출고량 > 이전재고+입고). 재고 기재 누락 가능성.", c: "text-warn" },
  NOT_OPERATED: { l: "미운영", t: "전 기간 출고 이력이 없음 — 운영하지 않는 품목이라 발주 대상 아님.", c: "text-ink-faint" },
};

// 예측 일수요는 대시보드와 같은 순서로 폴백한다(muForecast → muCorrected → mu).
// 어느 값이 쓰였는지 화면에 밝혀야 담당자가 숫자를 신뢰할지 판단할 수 있다.
const detailMu = (r: any) => Number(r.muForecast ?? r.muCorrected ?? r.mu ?? 0);
const muSource = (r: any) =>
  r.muForecast != null ? "직전 3개월 예측"
  : r.muCorrected != null ? "절단보정값(예측 없음)"
  : r.mu != null ? "원본 평균(보정 없음)"
  : "수요 기록 없음";

// ROP 는 백엔드가 이미 계산해 내려준 값이고, 그때 쓴 μ 는 화면이 곡선에 쓰는
// μ(예측·절단보정 폴백)와 다를 수 있다. 실제로 다르다 — 예: ROP 2,843.5 ·
// SS 1,817.7 · L 16.2 인 행의 역산 μ 는 63.3 인데 화면 표시 μ 는 70.18 이었다.
// 그래서 분해식은 ROP 에서 역산한 μ 로 세운다. 그래야 식이 실제로 맞아떨어진다.
const muFromRop = (r: any) => {
  const L = Number(r.leadTimeUsed ?? 0);
  if (!(L > 0)) return null;
  const v = (Number(r.ROP ?? 0) - Number(r.SS ?? 0)) / L;
  return Number.isFinite(v) ? v : null;
};
// 두 μ 가 눈에 띄게 벌어지면 곡선과 ROP 가 서로 다른 기준이라는 뜻이라 알린다.
const muDiverges = (r: any) => {
  const a = muFromRop(r), b = detailMu(r);
  if (a == null || !(b > 0) || !(a > 0)) return false;
  return Math.abs(a - b) / Math.max(a, b) > 0.05;
};
// 리드타임이 정수가 아니면 소수 한 자리까지 — 16.2 를 '16일'로 적으면 식이 안 맞아 보인다.
const fmtL = (L: number) => (Number.isInteger(L) ? String(L) : L.toFixed(1));

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
  // 화면 상태를 URL 에서 복원한다. 담당자가 조건을 잡아놓고 새로고침하거나
  // 링크를 공유하면 그대로 열려야 한다(종전에는 전부 초기화됐다).
  const sp = useSearchParams();
  const q0 = (k: string, d = "") => sp.get(k) ?? d;
  const b0 = (k: string) => sp.get(k) === "1";

  const [institution, setInstitution] = useState(initInstitution);
  const [status, setStatus] = useState(q0("status"));  // 서버측 필터(전국 전체 기준)
  useEffect(() => setInstitution(initInstitution), [initInstitution]);

  // 컬럼별 클라이언트 필터 (불러온 목록 내에서 적용)
  const [fInst, setFInst] = useState(q0("inst"));
  const [fItem, setFItem] = useState(q0("item"));
  const [fRisk, setFRisk] = useState(q0("risk"));
  const [fZsr, setFZsr] = useState(q0("zsr"));   // 재고0 원인 필터
  const [fMin, setFMin] = useState<Record<string, string>>({});
  const [showNonMed, setShowNonMed] = useState(b0("nonmed"));        // 비의료품 기본 숨김
  const [showFamCovered, setShowFamCovered] = useState(b0("famcov")); // 품목군 재고보유분 기본 숨김
  const [showNotOperated, setShowNotOperated] = useState(b0("notop")); // 미운영 기본 숨김
  const [sortKey, setSortKey] = useState<string | null>(sp.get("sort"));
  const [sortDir, setSortDir] = useState<"asc" | "desc">(q0("dir") === "desc" ? "desc" : "asc");
  const [openKey, setOpenKey] = useState<string | null>(null);  // 펼쳐진 행

  // 상태 → URL. history 를 더럽히지 않도록 replaceState 로 덮어쓴다.
  useEffect(() => {
    const p = new URLSearchParams();
    const put = (k: string, v: string) => { if (v) p.set(k, v); };
    put("institution", institution);
    put("status", status);
    put("inst", fInst); put("item", fItem); put("risk", fRisk); put("zsr", fZsr);
    if (showNonMed) p.set("nonmed", "1");
    if (showFamCovered) p.set("famcov", "1");
    if (showNotOperated) p.set("notop", "1");
    if (sortKey) { p.set("sort", sortKey); p.set("dir", sortDir); }
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [institution, status, fInst, fItem, fRisk, fZsr, showNonMed, showFamCovered, showNotOperated, sortKey, sortDir]);

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
  const colCount = institution ? 9 : 10;  // 기관 컬럼은 기관 선택 시 숨는다

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

  // 기본 제외 항목을 한 곳에 모은다. 화면 상단에서 '무엇이 왜 빠졌는지'를
  // 한 줄로 보여주고, 각 항목을 눌러 되돌릴 수 있게 한다.
  const EXCLUSIONS = [
    {
      key: "nonmed", label: "비의료품", count: nonMedCount, on: showNonMed,
      why: "판촉·홍보물·문구류 등 예측 대상이 아닌 품목",
      toggle: () => setShowNonMed((v) => !v),
    },
    {
      key: "famcov", label: "품목군 재고보유", count: famCoveredCount, on: showFamCovered,
      why: "같은 기관·품목군에 재고가 남아 있는데 이 코드만 0이라 긴급부족으로 뜬 항목",
      toggle: () => setShowFamCovered((v) => !v),
    },
    {
      key: "notop", label: "미운영", count: notOperatedCount, on: showNotOperated,
      why: "전 기간 출고 이력이 없어 재고만 0인 품목 — 발주 대상이 아님",
      toggle: () => setShowNotOperated((v) => !v),
    },
  ];
  const hiddenTotal = EXCLUSIONS.reduce((s, x) => s + (x.on ? 0 : x.count), 0);
  const anyExclusionOn = showNonMed || showFamCovered || showNotOperated;
  const showEverything = () => { setShowNonMed(true); setShowFamCovered(true); setShowNotOperated(true); };

  // 화면에 보이는 것(필터·정렬 반영)을 그대로 CSV 로. 담당자가 발주서를 만들 때
  // 표를 다시 손으로 옮겨적던 단계를 없앤다. 엑셀 한글 깨짐 방지로 BOM 을 붙인다.
  function exportCsv() {
    const head = ["기관", "시도", "시군구", "물품코드", "품목명", "현재고", "가용", "SS", "ROP", "발주권고", "위험", "상태", "재고0원인"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = rows.map((r) => [
      r.institutionName, r.sido, r.sigungu, r.standardCode, r.standardName,
      r.onHand, r.available, Math.round(r.SS ?? 0), Math.round(r.ROP ?? 0), r.orderRecommendation,
      RISK_LABEL[r.supplyRiskLevel] ?? r.supplyRiskLevel ?? "",
      STATUS_LABEL[r.status] ?? r.status ?? "",
      ZERO_REASON[r.zeroStockReason]?.l ?? "",
    ].map(esc).join(","));
    const blob = new Blob(["﻿" + [head.map(esc).join(","), ...body].join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `재고발주_${instName ?? "전국"}_${rows.length}건.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <Toolbar className="mb-4">
        <Field label="상태 (전국 조회)">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="min-w-[150px]">
            {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
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
        {rows.length > 0 && (
          <button
            onClick={exportCsv}
            title="지금 화면에 보이는 행을 그대로 내려받습니다"
            className="ml-auto self-end border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted hover:border-accent hover:text-accent-dark"
          >
            CSV 내려받기 <span className="font-mono text-xs tabular-nums">{num(rows.length)}</span>
          </button>
        )}
      </Toolbar>

      {/* 제외 현황 — 기본값이 데이터를 숨기고 있다는 사실을 한 줄로 드러낸다.
          종전에는 체크박스 3개가 툴바에 흩어져 있어, 담당자가 '전체를 보고 있다'고
          오해하기 쉬웠다. 무엇이 왜 빠졌는지와 되돌리는 방법을 같은 줄에 둔다. */}
      {(hiddenTotal > 0 || anyExclusionOn) && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-line bg-surface px-3 py-2 text-[13px]">
          <span className="font-medium text-ink">
            {hiddenTotal > 0 ? `${num(hiddenTotal)}건 제외됨` : "전체 표시 중"}
          </span>
          {EXCLUSIONS.map((x) =>
            x.count > 0 ? (
              <button
                key={x.key}
                onClick={x.toggle}
                title={x.why}
                className={`border-l-[3px] pl-1.5 transition-colors ${
                  x.on ? "border-l-accent text-accent-dark" : "border-l-line text-ink-muted hover:text-ink"
                }`}
              >
                {x.label} <span className="font-mono tabular-nums">{num(x.count)}</span>
                {x.on && <span className="ml-1 text-2xs">표시중</span>}
              </button>
            ) : null,
          )}
          <button
            onClick={showEverything}
            className="ml-auto border border-line px-2 py-0.5 text-ink-muted hover:text-ink"
          >
            모두 표시
          </button>
        </div>
      )}

      <Card bodyClassName="p-0">
        {inv.loading && <div className="p-4"><SkeletonTable cols={8} rows={12} /></div>}
        {inv.error && <div className="p-5"><State loading={false} error={inv.error} /></div>}
        {inv.data && rawItems.length === 0 && (
          <EmptyState title="해당 조건의 재고가 없습니다" desc="상태 필터를 바꿔보세요." />
        )}
        {rawItems.length > 0 && (
          <div className="max-h-[calc(100vh-16rem)] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_theme(colors.line)]">
                <tr className="border-b border-line bg-surface">
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
                <tr className="border-b border-line bg-paper">
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
                {rows.map((r, i) => {
                  const rowKey = `${r.institutionCode ?? ""}:${r.standardCode ?? i}`;
                  const open = openKey === rowKey;
                  return (
                  <Fragment key={rowKey}>
                  <tr
                    onClick={() => setOpenKey(open ? null : rowKey)}
                    className={`cursor-pointer transition-colors hover:bg-paper ${open ? "bg-accent-soft" : r.status === "CRITICAL" ? "bg-crit-soft/30" : ""}`}
                  >
                    {!institution && (
                      <Td className="max-w-[160px]">
                        <span className="block truncate text-ink-muted">{r.institutionName}</span>
                        <span className="block truncate text-xs text-ink-faint">{r.sido} {r.sigungu}</span>
                      </Td>
                    )}
                    <Td className="max-w-[220px]">
                      <span className="flex items-start gap-1.5">
                        {/* 펼침 표시 — 행이 눌린다는 걸 알려주는 유일한 단서다 */}
                        <span className={`mt-0.5 select-none text-[9px] leading-none text-ink-faint transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
                        <span className="min-w-0">
                          {/* 펼친 행은 이름을 자르지 않는다 */}
                          <span className={`block font-medium text-ink ${open ? "whitespace-normal break-words" : "truncate"}`}>{r.standardName}</span>
                          <span className="font-mono text-xs text-ink-faint">{r.standardCode}</span>
                        </span>
                      </span>
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
                  {/* 펼침 상세 — 표는 결과 숫자만 보여준다. 담당자가 발주량을 믿고
                      결재를 올리려면 '이 ROP 가 어디서 나왔는지'가 같은 자리에 있어야 한다. */}
                  {open && (
                    <tr className="bg-accent-soft/40">
                      <td colSpan={colCount} className="px-4 py-4">
                        <div className="grid gap-5 lg:grid-cols-2">
                          <div className="min-w-0">
                            <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">산출 근거</div>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
                              <dt className="text-ink-muted">ROP 산정 μ</dt>
                              <dd className="font-mono tabular-nums text-ink">
                                {muFromRop(r) != null ? `${muFromRop(r)!.toFixed(2)} ${r.uom ?? ""}` : "—"}
                                <span className="ml-1.5 font-sans text-2xs text-ink-faint">ROP·SS 역산</span>
                              </dd>
                              <dt className="text-ink-muted">리드타임 L</dt>
                              <dd className="font-mono tabular-nums text-ink">{fmtL(Number(r.leadTimeUsed ?? 0))}일</dd>
                              <dt className="text-ink-muted">안전재고 SS</dt>
                              <dd className="font-mono tabular-nums text-ink">{num(Math.round(r.SS ?? 0))}</dd>
                              <dt className="text-ink-muted">재주문점 ROP</dt>
                              <dd className="font-mono tabular-nums text-ink">
                                {num(Math.round(r.ROP ?? 0))}
                                {muFromRop(r) != null && (
                                  <span className="ml-1.5 font-sans text-2xs text-ink-faint">
                                    = μ×L({num(Math.round(muFromRop(r)! * Number(r.leadTimeUsed ?? 0)))}) + SS({num(Math.round(r.SS ?? 0))})
                                  </span>
                                )}
                              </dd>
                              <dt className="text-ink-muted">현재 가용</dt>
                              <dd className="font-mono tabular-nums text-ink">{num(r.available)}</dd>
                              <dt className="text-ink-muted">곡선 기준 μ</dt>
                              <dd className="font-mono tabular-nums text-ink">
                                {detailMu(r).toFixed(2)}
                                <span className="ml-1.5 font-sans text-2xs text-ink-faint">{muSource(r)}</span>
                              </dd>
                            </dl>
                            {/* 두 μ 가 벌어지면 오른쪽 곡선과 ROP 가 서로 다른 기준이라는 뜻이다.
                                조용히 숨기면 담당자가 둘을 같은 근거로 오해한다. */}
                            {muDiverges(r) && (
                              <p className="mt-2 border-l-[3px] border-l-caution pl-2 text-2xs leading-snug text-ink-muted">
                                ROP 는 저장된 값({muFromRop(r)!.toFixed(2)}/일 기준)이고 오른쪽 곡선은
                                최신 수요({detailMu(r).toFixed(2)}/일)로 그립니다 — 기준이 달라 소진 시점과
                                발주 시점이 어긋나 보일 수 있습니다.
                              </p>
                            )}
                            <div className="mt-3 flex items-baseline gap-2 border-t border-line pt-3">
                              <span className="text-[13px] text-ink-muted">권고 발주량</span>
                              <span className="font-mono text-lg font-semibold tabular-nums text-accent-dark">
                                {num(r.orderRecommendation)}
                              </span>
                              <span className="text-2xs text-ink-faint">{r.uom}</span>
                              <span className="ml-auto text-2xs text-ink-faint">
                                {Number(r.available ?? 0) <= Number(r.ROP ?? 0)
                                  ? "가용 ≤ ROP → 발주 시점"
                                  : "가용 > ROP → 아직 발주 시점 아님"}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">소진 예상</div>
                            <DepletionChart
                              available={Number(r.available ?? 0)}
                              mu={detailMu(r)}
                              SS={Number(r.SS ?? 0)}
                              ROP={Number(r.ROP ?? 0)}
                              leadTime={Number(r.leadTimeUsed ?? 0)}
                              uom={r.uom ?? ""}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={colCount} className="px-5 py-10 text-center text-sm text-ink-faint">컬럼 필터에 맞는 행이 없습니다.</td></tr>
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
