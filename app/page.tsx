"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "./lib/api";
import { num } from "./lib/format";
import {
  Card, Kpi, SectionHeader, RiskBadge, Th, Td, State,
  SkeletonStatGrid, SkeletonTable, EmptyState, MockBanner,
} from "./components/ui";
import DepletionChart from "./components/DepletionChart";
import RequireRole from "./components/RequireRole";

type Row = any;

// 소진 예상일(dts)과 리드타임(L) 비교로 발주 시급도 판정
function verdictOf(dts: number, L: number) {
  if (!Number.isFinite(dts)) return { key: "none", label: "수요 없음", cls: "bg-paper text-ink-faint" };
  if (dts <= L) return { key: "late", label: "리드타임 내 소진", cls: "bg-crit-soft text-crit" };
  if (dts <= L * 2) return { key: "soon", label: "임박", cls: "bg-warn-soft text-warn" };
  return { key: "ok", label: "여유", cls: "bg-ok-soft text-ok" };
}

// 수요패턴(Syntetos-Boylan) 뱃지 — 예측 난이도·방법을 한눈에.
// lumpy/intermittent = 간헐수요(단순평균 부적합, Croston류 필요). smooth = 예측 쉬움.
const PATTERN: Record<string, { label: string; cls: string }> = {
  lumpy: { label: "간헐·변동", cls: "bg-crit-soft text-crit" },
  intermittent: { label: "간헐", cls: "bg-warn-soft text-warn" },
  erratic: { label: "변동", cls: "bg-caution-soft text-caution" },
  smooth: { label: "안정", cls: "bg-ok-soft text-ok" },
};
function PatternBadge({ pattern }: { pattern: string }) {
  const p = PATTERN[pattern];
  if (!p) return null;
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${p.cls}`}>{p.label}</span>;
}

function Forecast() {
  const inv = useApi<any>("/inventory-policy");
  const dash = useApi<any>("/dashboard/central");
  const [sel, setSel] = useState<Row | null>(null);

  const rows: Row[] = useMemo(() => {
    const items: Row[] = inv.data?.items ?? [];
    return items
      // 비의료품(판촉·홍보물)과 휴면품목(DORMANT: 재고 있어도 안 씀)은 예측·발주 대상 아님.
      // isMedical/demandClass 가 아직 미적재(null)면 통과(보수적).
      .filter((r) => r.isMedical !== false && r.demandClass !== "DORMANT")
      // 물품코드 분산 오탐 제거(ai#33): 이 코드는 0이어도 같은 기관·같은 품목군(family)에
      // 재고가 남아 있으면 실제로는 소진이 아니다(혈당스틱이 코드 52개로 쪼개진 사례 등).
      // familyAvailable 미적재(null)면 통과 — 보수적.
      .filter((r) => !(Number(r.available ?? 0) <= 0 && Number(r.familyAvailable ?? 0) > 0))
      // 미운영 제외(ai#32): 전 기간 출고 이력이 없어 재고만 0인 품목은 소진 대상이 아니다.
      // demandClass 만으로는 못 걸러진다 — 재고공백비율이 높으면 CENSORED 로 분류되어
      // DORMANT 필터를 통과하고, muForecast 가 없어 muCorrected(미세값)로 폴백되면
      // '가용0 ÷ 미세수요 = D+0' 이 되어 목록 최상단을 차지한다(실측 128건 중 84건).
      .filter((r) => r.zeroStockReason !== "NOT_OPERATED")
      .map((r) => {
        // 소진예측 수요율 = 예측치(muForecast, 직전3개월 roll3) 우선.
        // 홀드아웃 백테스트에서 roll3(WAPE 42.6%)가 정적평균(49.9%)·절단보정보다 정확.
        // muForecast 미적재(최근 무활동)면 절단보정→원본 mu 순으로 폴백.
        const mu = Number(r.muForecast ?? r.muCorrected ?? r.mu ?? 0);
        const dts = mu > 0 ? Number(r.available ?? 0) / mu : Infinity;
        // 최근 3개월 실수요. 이미 재고 0 인 건들은 소진일수가 전부 0 으로 동률이 되므로,
        // 이 값으로 2차 정렬해 '지금 실제로 쓰이고 있는' 품목을 위로 올린다.
        // (muForecast 가 없다고 숨기지는 않는다 — 만성 결품이라 못 판 경우일 수 있음=절단편향)
        const recent = Number(r.muForecast ?? 0);
        return { ...r, _mu: mu, _dts: dts, _recent: recent, _L: Number(r.leadTimeUsed ?? 0) };
      })
      .filter((r) => Number.isFinite(r._dts))          // 수요 0 품목은 소진 예측 대상 아님
      .sort((a, b) => a._dts - b._dts || b._recent - a._recent);  // 동률이면 최근 실수요 큰 순
  }, [inv.data]);

  useEffect(() => { if (!sel && rows.length) setSel(rows[0]); }, [rows, sel]);

  const noDemand = (inv.data?.items?.length ?? 0) - rows.length;
  const kLate = rows.filter((r) => r._dts <= r._L).length;
  const k30 = rows.filter((r) => r._dts <= 30).length;
  const kOrder = rows.filter((r) => Number(r.orderRecommendation ?? 0) > 0).length;
  const ranking: any[] = dash.data?.supplyRiskRanking ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-ink">재고 공급 부족 예상</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-ink-muted">
          <b className="text-ink">예측 수요율</b>(직전 3개월 실적 기반)로 소진 시점을 추정하고,
          <b className="text-ink"> 리드타임</b>과 비교해 발주 시급도를 판정합니다.
          판촉·홍보물(비의료품)과 <b className="text-ink">휴면 품목</b>(재고 있어도 안 씀)은 제외했습니다.
        </p>
      </div>

      {/* KPI */}
      {inv.loading && <SkeletonStatGrid count={4} />}
      {inv.error && <Card><State loading={false} error={inv.error} /></Card>}
      {!inv.loading && !inv.error && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="리드타임 내 소진" value={num(kLate)} tone="danger" hint="발주해도 늦는 품목" />
          <Kpi label="30일 내 소진" value={num(k30)} tone="warn" hint="곧 부족해질 품목" />
          <Kpi label="발주 권고 발생" value={num(kOrder)} tone="accent" hint="권고수량 > 0" href="/inventory" />
          <Kpi label="재주문점 미달(전국)" value={num(dash.data?.summary?.belowRopItems)} hint="ROP 아래 재고" href="/inventory" />
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
        {/* 부족 예상 D-day 리스트 */}
        <Card
          bodyClassName="p-0"
          title="부족 예상 순위"
          action={<Link href="/inventory" className="text-xs font-semibold text-accent hover:text-accent-dark">재고·발주 전체 →</Link>}
        >
          {inv.loading && <div className="p-4"><SkeletonTable cols={6} rows={10} /></div>}
          {!inv.loading && rows.length === 0 && (
            <EmptyState title="소진 예상 품목이 없습니다" desc="수요가 기록된 품목이 없어 소진 시점을 추정할 수 없습니다." />
          )}
          {rows.length > 0 && (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-line">
                    <Th>기관 · 품목</Th>
                    <Th className="text-right">가용</Th>
                    <Th className="text-right">예측수요</Th>
                    <Th className="text-right">소진예상</Th>
                    <Th className="text-right">리드타임</Th>
                    <Th>판정</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.slice(0, 100).map((r, i) => {
                    const v = verdictOf(r._dts, r._L);
                    const on = sel && sel.standardCode === r.standardCode && sel.institutionId === r.institutionId;
                    return (
                      <tr
                        key={i}
                        onClick={() => setSel(r)}
                        className={`cursor-pointer transition-colors ${on ? "bg-accent-soft" : "hover:bg-paper"}`}
                      >
                        <Td className="max-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-ink">{r.standardName}</span>
                            {r.demandPattern && <PatternBadge pattern={r.demandPattern} />}
                          </span>
                          <span className="block truncate text-xs text-ink-faint">{r.institutionName}</span>
                        </Td>
                        <Td className="text-right font-semibold">{num(r.available)}</Td>
                        <Td className="text-right text-ink-muted">{r._mu.toFixed(2)}</Td>
                        <Td className="text-right font-bold text-ink">D+{Math.round(r._dts)}</Td>
                        <Td className="text-right text-ink-muted">{Math.round(r._L)}일</Td>
                        <Td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.cls}`}>{v.label}</span></Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-line px-5 py-3 text-xs text-ink-faint">
            소진 임박순 상위 {Math.min(rows.length, 100)}건 표시
            {noDemand > 0 && ` · 수요 기록 없는 ${num(noDemand)}건 제외`}
          </div>
        </Card>

        {/* 선택 품목: 재고량 예상 곡선 + 발주권고 */}
        <div className="space-y-5">
          <Card title="재고량 예상">
            {!sel && <EmptyState title="품목을 선택하세요" desc="왼쪽 목록에서 품목을 클릭하면 소진 곡선이 표시됩니다." />}
            {sel && (
              <>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{sel.standardName}</div>
                    <div className="truncate text-xs text-ink-faint">{sel.institutionName}</div>
                  </div>
                  {sel.demandPattern && <PatternBadge pattern={sel.demandPattern} />}
                </div>
                <DepletionChart
                  available={Number(sel.available ?? 0)}
                  mu={sel._mu}
                  SS={Number(sel.SS ?? 0)}
                  ROP={Number(sel.ROP ?? 0)}
                  leadTime={sel._L}
                  uom={sel.uom ?? ""}
                />
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-ink-faint">현재 가용</dt>
                  <dd className="text-right font-semibold tabular-nums text-ink">{num(sel.available)} {sel.uom}</dd>
                  <dt className="text-ink-faint">예측 일수요</dt>
                  <dd className="text-right tabular-nums text-ink">
                    {sel._mu.toFixed(2)}
                    {sel.mu != null && Number(sel.mu) !== sel._mu && (
                      <span className="ml-1 text-xs text-ink-faint">(원본 {Number(sel.mu).toFixed(2)})</span>
                    )}
                  </dd>
                  <dt className="text-ink-faint">안전재고 SS</dt>
                  <dd className="text-right tabular-nums text-ink">{num(Math.round(sel.SS ?? 0))}</dd>
                  <dt className="text-ink-faint">재주문점 ROP</dt>
                  <dd className="text-right tabular-nums text-ink">{num(Math.round(sel.ROP ?? 0))}</dd>
                </dl>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-accent-soft px-4 py-3">
                  <span className="text-sm font-semibold text-accent-dark">권고 발주량</span>
                  <span className="font-serif text-xl font-bold tabular-nums text-accent-dark">
                    {num(sel.orderRecommendation)} <span className="text-xs font-normal">{sel.uom}</span>
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card title="공급위험 상위 품목군">
            <MockBanner reason="원자재·뉴스 실연동 전 목업값(모듈 C)." />
            {ranking.length === 0 && <p className="text-sm text-ink-faint">데이터 없음</p>}
            <ul className="space-y-2">
              {ranking.slice(0, 4).map((r) => (
                <li key={r.itemGroupId} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.itemGroupName}</span>
                  <span className="tabular-nums text-xs text-ink-faint">{r.riskScore}</span>
                  <RiskBadge level={r.level} />
                </li>
              ))}
            </ul>
            <Link href="/supply-risk" className="mt-3 block text-xs font-semibold text-accent hover:text-accent-dark">
              공급위험 상세 →
            </Link>
          </Card>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        ※ 소진 곡선은 <b>직전 3개월 실적 기반 예측 수요율</b>을 일정하다고 본 선형 투영입니다.
        홀드아웃 백테스트(미검증 3개월)에서 이 방식(WAPE 42.6%)이 24개월 정적평균(49.9%)보다 정확했습니다.
        수요의 간헐성·변동성까지 반영한 AI 예측(LightGBM, 독립테스트 WAPE 37.6%)은 연동 시 이 곡선이 그대로 고도화됩니다
        (<Link href="/inventory" className="underline underline-offset-2">재고·발주</Link>에서 전체 표 확인).
      </p>
    </div>
  );
}

export default function ForecastHome() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <Forecast />
    </RequireRole>
  );
}
