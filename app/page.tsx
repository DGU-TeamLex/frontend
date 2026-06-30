"use client";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "./lib/api";
import { num } from "./lib/format";
import { Card, StatusBadge, Th, Td, State, PageTitle } from "./components/ui";

const BADGE_CLASS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  WARN: "bg-orange-100 text-orange-700 border-orange-200",
  WATCH: "bg-amber-100 text-amber-700 border-amber-200",
  OK: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const enc = encodeURIComponent;

export default function ExplorerHome() {
  const [category, setCategory] = useState<string | null>(null);
  const [sido, setSido] = useState<string>("");
  const [sigungu, setSigungu] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);

  const cats = useApi<any>("/facility-categories");
  // 카테고리 기본값
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

  // 목록 로드되면 첫 기관 자동 선택
  useEffect(() => {
    const items = facilities.data?.items;
    if (items?.length) setSelected(items[0].id);
    else setSelected(null);
  }, [facilities.data]);

  const detail = useApi<any>(selected ? `/facilities/${selected}` : null);

  return (
    <div>
      <PageTitle
        title="지역·기관 재고 탐색"
        desc="기관유형과 지역(시·도→시·군·구)을 선택하면 해당 보건의료기관의 재고 현황을 볼 수 있습니다. (전국 지역보건의료기관 현황, 보건복지부)"
      />

      {/* 1. 기관 유형 */}
      <div className="mb-4">
        <div className="mb-1 text-xs font-semibold text-slate-500">1 · 기관 유형</div>
        <State loading={cats.loading} error={cats.error} />
        <div className="flex flex-wrap gap-2">
          {cats.data?.items?.map((c: any) => {
            const active = category === c.category;
            return (
              <button
                key={c.category}
                onClick={() => { setCategory(c.category); setSido(""); setSigungu(""); setSelected(null); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                  active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {c.category}
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {num(c.count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2~4. 시도 / 시군구 / 검색 */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-500">2 · 시·도</div>
          <select
            value={sido}
            onChange={(e) => { setSido(e.target.value); setSigungu(""); setSelected(null); }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">시·도 선택</option>
            {sidoApi.data?.items?.map((s: any) => (
              <option key={s.name} value={s.name}>{s.name} ({num(s.count)})</option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-500">3 · 시·군·구</div>
          <select
            value={sigungu}
            onChange={(e) => { setSigungu(e.target.value); setSelected(null); }}
            disabled={!sido}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">{sido ? "시·군·구 선택" : "먼저 시·도 선택"}</option>
            {sigunguApi.data?.items?.map((s: any) => (
              <option key={s.name} value={s.name}>{s.name} ({num(s.count)})</option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-500">4 · 기관 검색</div>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelected(null); }}
            placeholder="기관명으로 검색"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* 결과: 목록 + 상세 */}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* 좌: 기관 목록 */}
        <Card className="!p-0" title={facPath ? `${sido} ${sigungu} · ${category} ${facilities.data ? `${facilities.data.totalElements}곳` : ""}` : "기관 목록"}>
          <div className="p-3">
            {!facPath && <p className="px-2 py-6 text-center text-sm text-slate-400">시·군·구를 선택하거나 기관명을 검색하세요.</p>}
            <State loading={facilities.loading} error={facilities.error} />
            {facPath && facilities.data?.items?.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-400">해당 조건의 기관이 없습니다.</p>}
            <ul className="space-y-1">
              {facilities.data?.items?.map((f: any) => {
                const active = selected === f.id;
                const b = f.summary.badge;
                return (
                  <li key={f.id}>
                    <button
                      onClick={() => setSelected(f.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        active ? "bg-slate-100 ring-1 ring-slate-300" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">{f.name}</span>
                        <span className="block text-xs text-slate-400">{f.type}{f.island ? " · 도서" : ""}</span>
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${BADGE_CLASS[b.level]}`}>
                        {b.label}{b.count ? ` ${b.count}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {facilities.data?.truncated && (
              <p className="px-2 pt-2 text-xs text-slate-400">상위 {facilities.data.returned}곳만 표시 (총 {num(facilities.data.totalElements)}곳)</p>
            )}
          </div>
        </Card>

        {/* 우: 선택 기관 재고 현황 */}
        <Card title={detail.data ? `${detail.data.institution.name} — 재고 현황` : "재고 현황"}
          action={detail.data ? <span className="text-xs text-slate-400">{detail.data.institution.sido} {detail.data.institution.sigungu} · {detail.data.institution.type}</span> : null}>
          {!selected && <p className="py-8 text-center text-sm text-slate-400">왼쪽에서 기관을 선택하세요.</p>}
          <State loading={detail.loading} error={detail.error} />
          {detail.data && (
            <>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">관리 품목</div><div className="text-lg font-bold">{detail.data.summary.trackedItems}</div></div>
                <div className="rounded-lg bg-orange-50 p-3"><div className="text-xs text-slate-500">재주문점 미달</div><div className="text-lg font-bold text-orange-600">{detail.data.summary.belowRop}</div></div>
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">발주 필요</div><div className="text-lg font-bold">{detail.data.summary.orderNeeded}</div></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <Th>품목 (표준코드)</Th>
                      <Th className="text-right">현재고</Th>
                      <Th className="text-right">가용</Th>
                      <Th className="text-right">ROP</Th>
                      <Th className="text-right">발주권고</Th>
                      <Th>상태</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detail.data.inventory.map((r: any, i: number) => (
                      <tr key={i} className={r.status === "CRITICAL" ? "bg-red-50/40" : ""}>
                        <Td className="font-medium">{r.standardName}<span className="ml-1 font-mono text-xs text-slate-400">{r.standardCode}</span></Td>
                        <Td className="text-right">{num(r.onHand)}</Td>
                        <Td className="text-right font-semibold">{num(r.available)}</Td>
                        <Td className="text-right text-slate-500">{num(r.ROP)}</Td>
                        <Td className="text-right">{r.orderRecommendation > 0 ? <span className="font-bold">{num(r.orderRecommendation)}</span> : <span className="text-slate-300">0</span>}</Td>
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
