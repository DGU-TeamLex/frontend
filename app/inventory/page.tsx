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
const STATUS_CHIPS = [
  { key: "", label: "전체" },
  { key: "CRITICAL", label: "긴급 부족" },
  { key: "BELOW_ROP", label: "재주문점 미달" },
  { key: "WATCH", label: "주의" },
  { key: "OK", label: "정상" },
];

// ── 탭 1: 전국 재고정책 (inventory-policy, 실데이터) ──────────────────────
function PolicyTab({ initInstitution }: { initInstitution: string }) {
  const [institution, setInstitution] = useState(initInstitution);
  const [status, setStatus] = useState("");
  useEffect(() => setInstitution(initInstitution), [initInstitution]);

  const path = useMemo(() => {
    const qs = new URLSearchParams();
    if (institution) qs.set("institution", institution);
    if (status) qs.set("status", status);
    const q = qs.toString();
    return `/inventory-policy${q ? `?${q}` : ""}`;
  }, [institution, status]);
  const inv = useApi<any>(path);

  const items: any[] = inv.data?.items ?? [];
  const instName = items[0]?.institutionName;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setStatus(c.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
              status === c.key ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-muted hover:border-accent/40 hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
        {institution && (
          <button
            onClick={() => setInstitution("")}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-muted hover:text-crit"
          >
            <span className="font-medium text-ink">{instName ?? "선택 기관"}</span> 필터 해제 ✕
          </button>
        )}
      </div>

      <Card bodyClassName="p-0">
        {inv.loading && <div className="p-4"><SkeletonTable cols={8} rows={10} /></div>}
        {inv.error && <div className="p-5"><State loading={false} error={inv.error} /></div>}
        {inv.data && items.length === 0 && (
          <EmptyState title="해당 조건의 재고가 없습니다" desc="상태 필터나 기관을 바꿔보세요." />
        )}
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  {!institution && <Th>기관</Th>}
                  <Th>품목 (표준코드)</Th>
                  <Th className="text-right">현재고</Th>
                  <Th className="text-right">가용</Th>
                  <Th className="text-right">SS</Th>
                  <Th className="text-right">ROP</Th>
                  <Th className="text-right">발주권고</Th>
                  <Th>위험</Th>
                  <Th>상태</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((r, i) => (
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
              </tbody>
            </table>
          </div>
        )}
        {inv.data?.totalElements > 0 && (
          <div className="border-t border-line px-5 py-3 text-xs text-ink-faint">
            {institution ? `${instName} · ` : "전국 시급도순 · "}
            총 {num(inv.data.totalElements)}건{!institution && inv.data.totalElements >= 500 ? " 중 상위 500건" : ""}
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
      <PageTitle title="재고·발주" desc="전국 재고정책(SS·ROP·발주권고), 기관별 탐색, 표준품목 검색을 한곳에서." />
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
