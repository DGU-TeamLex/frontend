"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "../lib/api";
import { num, CRITICALITY_LABEL } from "../lib/format";
import {
  Card, Tabs, Toolbar, Field, Select, TextInput, RiskBadge, StatusBadge,
  Th, Td, State, Skeleton, SkeletonTable, SkeletonList, EmptyState, PageTitle,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

const enc = encodeURIComponent;

// 정렬 순위 (범주형)
const RISK_RANK: Record<string, number> = { CRITICAL: 0, WARNING: 1, CAUTION: 2, NORMAL: 3 };
const STAT_RANK: Record<string, number> = { CRITICAL: 0, BELOW_ROP: 1, WATCH: 2, OK: 3 };
const RISK_OPTS: [string, string][] = [["", "전체"], ["CRITICAL", "심각"], ["WARNING", "경계"], ["CAUTION", "주의"], ["NORMAL", "정상"]];
const STATUS_OPTS: [string, string][] = [["", "전체"], ["CRITICAL", "긴급 부족"], ["BELOW_ROP", "재주문점 미달"], ["WATCH", "주의"], ["OK", "정상"]];

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

// ── 탭 1: 전국 재고정책 (inventory-policy, 실데이터) ──────────────────────
function PolicyTab({ initInstitution }: { initInstitution: string }) {
  const [institution, setInstitution] = useState(initInstitution);
  const [status, setStatus] = useState("");          // 서버측 필터(전체 데이터 기준)
  useEffect(() => setInstitution(initInstitution), [initInstitution]);

  // 컬럼별 클라이언트 필터 (불러온 목록 내에서 적용)
  const [fInst, setFInst] = useState("");
  const [fItem, setFItem] = useState("");
  const [fRisk, setFRisk] = useState("");
  const [fMin, setFMin] = useState<Record<string, string>>({});
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

  const anyFilter = fInst || fItem || fRisk || Object.values(fMin).some((v) => v !== "");

  const rows = useMemo(() => {
    let r = rawItems.filter((x) => {
      if (fInst && !`${x.institutionName ?? ""} ${x.sido ?? ""} ${x.sigungu ?? ""}`.toLowerCase().includes(fInst.toLowerCase())) return false;
      if (fItem && !`${x.standardName ?? ""} ${x.standardCode ?? ""}`.toLowerCase().includes(fItem.toLowerCase())) return false;
      if (fRisk && (x.supplyRiskLevel ?? "NORMAL") !== fRisk) return false;
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
        if (sortKey === "institutionName" || sortKey === "standardName")
          return String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "ko") * dir;
        return (Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)) * dir;
      });
    }
    return r;
  }, [rawItems, fInst, fItem, fRisk, fMin, sortKey, sortDir]);

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
            onClick={() => { setFInst(""); setFItem(""); setFRisk(""); setFMin({}); }}
            className="self-end rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
          >
            컬럼 필터 초기화
          </button>
        )}
      </Toolbar>

      <Card bodyClassName="p-0">
        {inv.loading && <div className="p-4"><SkeletonTable cols={8} rows={10} /></div>}
        {inv.error && <div className="p-5"><State loading={false} error={inv.error} /></div>}
        {inv.data && rawItems.length === 0 && (
          <EmptyState title="해당 조건의 재고가 없습니다" desc="상태 필터나 기관을 바꿔보세요." />
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
                    <Td><StatusBadge status={r.status} /></Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-ink-faint">컬럼 필터에 맞는 행이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {inv.data?.totalElements > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs text-ink-faint">
            <span>{institution ? `${instName} · ` : "전국 시급도순 · "}총 {num(inv.data.totalElements)}건{!institution && inv.data.totalElements >= 500 ? " 중 상위 500건" : ""}</span>
            <span>{anyFilter ? `컬럼 필터 적용: ${num(rows.length)}건 표시 (불러온 목록 내)` : `${num(rawItems.length)}건 표시`}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── 탭 2: 기관별 탐색 (지역 캐스케이드 → 기관 → 재고) ──────────────────────
function ExploreTab({ onPickInstitution }: { onPickInstitution: (id: string) => void }) {
  const [category, setCategory] = useState<string | null>(null);
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const cats = useApi<any>("/facility-categories");
  useEffect(() => {
    if (!category && cats.data?.items?.length) setCategory(cats.data.items[0].category);
  }, [cats.data, category]);

  const sidoApi = useApi<any>(category ? `/facility-regions?category=${enc(category)}` : null);
  const sigunguApi = useApi<any>(category && sido ? `/facility-regions?category=${enc(category)}&sido=${enc(sido)}` : null);

  const facPath = useMemo(() => {
    if (!category || !sido) return null;
    if (!sigungu && !q) return null;
    let p = `/facilities?category=${enc(category)}&sido=${enc(sido)}`;
    if (sigungu) p += `&sigungu=${enc(sigungu)}`;
    if (q) p += `&q=${enc(q)}`;
    return p;
  }, [category, sido, sigungu, q]);
  const facilities = useApi<any>(facPath);

  useEffect(() => {
    const items = facilities.data?.items;
    setSelected(items?.length ? items[0].id : null);
  }, [facilities.data]);

  const detail = useApi<any>(selected ? `/facilities/${selected}` : null);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {cats.loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-28" />)}
        {cats.data?.items?.map((c: any) => {
          const active = category === c.category;
          return (
            <button
              key={c.category}
              onClick={() => { setCategory(c.category); setSido(""); setSigungu(""); setSelected(null); }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-muted hover:border-accent/40 hover:text-ink"
              }`}
            >
              {c.category}
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-paper text-ink-faint"}`}>{num(c.count)}</span>
            </button>
          );
        })}
      </div>

      <Toolbar className="mb-5">
        <Field label="시·도">
          <Select value={sido} onChange={(e) => { setSido(e.target.value); setSigungu(""); setSelected(null); }} className="min-w-[140px]">
            <option value="">시·도 선택</option>
            {sidoApi.data?.items?.map((x: any) => <option key={x.name} value={x.name}>{x.name} ({num(x.count)})</option>)}
          </Select>
        </Field>
        <Field label="시·군·구">
          <Select value={sigungu} onChange={(e) => { setSigungu(e.target.value); setSelected(null); }} disabled={!sido} className="min-w-[140px]">
            <option value="">{sido ? "전체" : "먼저 시·도 선택"}</option>
            {sigunguApi.data?.items?.map((x: any) => <option key={x.name} value={x.name}>{x.name} ({num(x.count)})</option>)}
          </Select>
        </Field>
        <Field label="기관 검색">
          <TextInput value={q} onChange={(e) => { setQ(e.target.value); setSelected(null); }} placeholder="기관명" className="min-w-[180px]" />
        </Field>
      </Toolbar>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card bodyClassName="p-3" title="기관 목록">
          {!facPath && <EmptyState title="지역을 선택하세요" desc="시·군·구를 고르거나 기관명을 검색하세요." />}
          {facilities.error && <State loading={false} error={facilities.error} />}
          {facilities.loading && <SkeletonList rows={7} />}
          {facPath && facilities.data?.items?.length === 0 && <EmptyState title="기관이 없습니다" />}
          <ul className="space-y-1">
            {facilities.data?.items?.map((f: any) => {
              const active = selected === f.id;
              const b = f.summary.badge;
              const bcls: Record<string, string> = { CRITICAL: "bg-crit-soft text-crit", WARN: "bg-warn-soft text-warn", WATCH: "bg-caution-soft text-caution", OK: "bg-ok-soft text-ok" };
              return (
                <li key={f.id}>
                  <button
                    onClick={() => setSelected(f.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-accent-soft ring-1 ring-accent/30" : "hover:bg-paper"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{f.name}</span>
                      <span className="block text-xs text-ink-faint">{f.type}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${bcls[b.level]}`}>{b.label}{b.count ? ` ${b.count}` : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          bodyClassName="p-0"
          title={detail.data ? detail.data.institution.name : "재고 현황"}
          action={
            detail.data ? (
              <button onClick={() => onPickInstitution(detail.data.institution.id)} className="text-xs font-semibold text-accent hover:text-accent-dark">
                이 기관 전체 재고정책 →
              </button>
            ) : null
          }
        >
          {!selected && <EmptyState title="기관을 선택하세요" desc="왼쪽 목록에서 기관을 고르면 재고가 표시됩니다." />}
          {detail.loading && <div className="p-5"><SkeletonTable cols={6} rows={6} /></div>}
          {detail.data && (
            <>
              <div className="grid grid-cols-4 gap-2 border-b border-line p-4 text-center">
                <div><div className="text-xs text-ink-muted">관리품목</div><div className="font-serif text-lg font-bold tabular-nums text-ink">{num(detail.data.summary.trackedItems)}</div></div>
                <div><div className="text-xs text-ink-muted">긴급</div><div className="font-serif text-lg font-bold tabular-nums text-crit">{num(detail.data.summary.critical)}</div></div>
                <div><div className="text-xs text-ink-muted">ROP미달</div><div className="font-serif text-lg font-bold tabular-nums text-warn">{num(detail.data.summary.belowRop)}</div></div>
                <div><div className="text-xs text-ink-muted">발주필요</div><div className="font-serif text-lg font-bold tabular-nums text-ink">{num(detail.data.summary.orderNeeded)}</div></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <Th>품목</Th><Th className="text-right">현재고</Th><Th className="text-right">가용</Th><Th className="text-right">ROP</Th><Th className="text-right">발주권고</Th><Th>상태</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {detail.data.inventory.map((r: any, i: number) => (
                      <tr key={i} className={r.status === "CRITICAL" ? "bg-crit-soft/40" : ""}>
                        <Td className="max-w-[220px]"><span className="block truncate font-medium">{r.standardName}</span><span className="font-mono text-xs text-ink-faint">{r.standardCode}</span></Td>
                        <Td className="text-right">{num(r.onHand)}</Td>
                        <Td className="text-right font-semibold">{num(r.available)}</Td>
                        <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                        <Td className="text-right">{r.orderRecommendation > 0 ? <span className="font-bold text-accent-dark">{num(r.orderRecommendation)}</span> : <span className="text-ink-faint">0</span>}</Td>
                        <Td><StatusBadge status={r.status} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── 탭 3: 표준품목 검색 (standard-items, 실데이터) ──────────────────────
function ItemsTab() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const groups = useApi<any>("/item-groups");
  const path = useMemo(() => {
    const qs = new URLSearchParams({ limit: "100" });
    if (q) qs.set("q", q);
    if (group) qs.set("group", group);
    return `/standard-items?${qs.toString()}`;
  }, [q, group]);
  const items = useApi<any>(path);

  return (
    <div>
      <Toolbar className="mb-4">
        <Field label="품목명·코드 검색">
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 인슐린, 주사기" className="min-w-[220px]" />
        </Field>
        <Field label="품목군">
          <Select value={group} onChange={(e) => setGroup(e.target.value)} className="min-w-[160px]">
            <option value="">전체 품목군</option>
            {groups.data?.items?.map((g: any) => <option key={g.itemGroupId} value={g.itemGroupId}>{g.name}</option>)}
          </Select>
        </Field>
      </Toolbar>
      <Card bodyClassName="p-0">
        {items.loading && <div className="p-4"><SkeletonTable cols={5} rows={10} /></div>}
        {items.error && <div className="p-5"><State loading={false} error={items.error} /></div>}
        {items.data?.items?.length === 0 && <EmptyState title="검색 결과가 없습니다" desc="다른 검색어를 입력해보세요." />}
        {items.data?.items?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>표준코드</Th><Th>품목명</Th><Th>단위</Th><Th>구분</Th><Th className="text-right">유효기간(일)</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.data.items.map((r: any) => (
                  <tr key={r.standardItemId} className="transition-colors hover:bg-paper">
                    <Td className="font-mono text-xs text-ink-muted">{r.standardCode}</Td>
                    <Td className="font-medium">{r.standardName}</Td>
                    <Td className="text-ink-muted">{r.uom}</Td>
                    <Td><span className="text-xs text-ink-muted">{CRITICALITY_LABEL[r.criticality] ?? r.criticality}</span></Td>
                    <Td className="text-right text-ink-muted">{num(r.shelfLifeDays)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {items.data?.totalElements != null && (
          <div className="border-t border-line px-5 py-3 text-xs text-ink-faint">
            총 {num(items.data.totalElements)}종 (표시 {items.data.items?.length ?? 0}종)
          </div>
        )}
      </Card>
    </div>
  );
}

function InventoryInner() {
  const params = useSearchParams();
  const urlInstitution = params.get("institution") ?? "";
  const [tab, setTab] = useState("policy");
  const [pinnedInstitution, setPinnedInstitution] = useState(urlInstitution);
  useEffect(() => { if (urlInstitution) { setPinnedInstitution(urlInstitution); setTab("policy"); } }, [urlInstitution]);

  return (
    <div>
      <PageTitle title="재고·발주" desc="전국 재고정책(SS·ROP·발주권고), 기관별 탐색, 표준품목 검색을 한곳에서. 재고정책 표는 컬럼별 필터·정렬 지원." />
      <div className="mb-5">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "policy", label: "전국 재고정책" },
            { key: "explore", label: "기관별 탐색" },
            { key: "items", label: "표준품목" },
          ]}
        />
      </div>
      {tab === "policy" && <PolicyTab initInstitution={pinnedInstitution} />}
      {tab === "explore" && <ExploreTab onPickInstitution={(id) => { setPinnedInstitution(id); setTab("policy"); }} />}
      {tab === "items" && <ItemsTab />}
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
