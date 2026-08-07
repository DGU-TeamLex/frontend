"use client";
import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import {
  Card, Toolbar, Field, Select, TextInput, Th, Td, State,
  SkeletonTable, EmptyState, PageTitle, Link,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

const CATEGORY_OPTS: [string, string][] = [
  ["", "전체"],
  ["보건소", "보건소"],
  ["보건지소", "보건지소"],
  ["보건진료소", "보건진료소"],
];

function InstitutionTable() {
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const path =
    "/facilities?limit=500" + (category ? `&category=${encodeURIComponent(category)}` : "");
  const fac = useApi<any>(path);
  const rawItems: any[] = fac.data?.items ?? [];

  const rows = useMemo(() => {
    if (!q) return rawItems;
    return rawItems.filter((r: any) => String(r.id ?? "").toLowerCase().includes(q.toLowerCase()));
  }, [rawItems, q]);

  return (
    <div>
      <div className="mb-4 rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink-muted">
        기관코드↔실제 기관 매핑 정보원 확보 전까지(backend#16) 기관명·지역은 표시하지 않고{" "}
        <span className="font-semibold text-ink">기관코드</span> 기준으로만 목록/상세를 제공합니다(잠정).
      </div>
      <Toolbar className="mb-4">
        <Field label="기관유형">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="min-w-[140px]">
            {CATEGORY_OPTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="기관코드 검색">
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="inst_0001" className="w-48" />
        </Field>
      </Toolbar>

      <Card bodyClassName="p-0">
        {fac.loading && (
          <div className="p-4">
            <SkeletonTable cols={6} rows={10} />
          </div>
        )}
        {fac.error && (
          <div className="p-5">
            <State loading={false} error={fac.error} />
          </div>
        )}
        {fac.data && rows.length === 0 && (
          <EmptyState title="해당 조건의 기관이 없습니다" desc="필터를 바꿔보세요." />
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>기관코드</Th>
                  <Th>기관유형</Th>
                  <Th className="text-right">추적 품목</Th>
                  <Th className="text-right">긴급부족</Th>
                  <Th className="text-right">재주문점 미달</Th>
                  <Th className="text-right">발주 필요</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r: any) => (
                  <tr key={r.id} className="transition-colors hover:bg-paper">
                    <Td>
                      <Link
                        href={`/institutions/${r.id}`}
                        className="font-mono font-medium text-accent-dark hover:underline"
                      >
                        {r.id}
                      </Link>
                    </Td>
                    <Td>{r.category}</Td>
                    <Td className="text-right">{num(r.summary?.trackedItems)}</Td>
                    <Td className="text-right">
                      {Number(r.summary?.critical ?? 0) > 0 ? (
                        <span className="font-semibold text-crit">{num(r.summary.critical)}</span>
                      ) : (
                        num(r.summary?.critical)
                      )}
                    </Td>
                    <Td className="text-right">{num(r.summary?.belowRop)}</Td>
                    <Td className="text-right">{num(r.summary?.orderNeeded)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {fac.data?.truncated && (
          <div className="px-4 py-3 text-xs text-ink-faint">
            전체 {num(fac.data.totalElements)}건 중 {num(fac.data.returned)}건 표시(상한 도달). 기관유형 필터로 좁혀보세요.
          </div>
        )}
      </Card>
    </div>
  );
}

export default function InstitutionsPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <PageTitle
        title="기관코드 목록"
        desc="REST 계약(GET /facilities) 기반 기관코드 목록 화면 골격 — 기관명·지역 미표출(잠정)."
      />
      <InstitutionTable />
    </RequireRole>
  );
}
