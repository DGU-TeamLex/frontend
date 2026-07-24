"use client";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { num, CRITICALITY_LABEL } from "../lib/format";
import {
  Card, Toolbar, Field, Select, TextInput, Th, Td, State,
  SkeletonTable, EmptyState, PageTitle,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

// 백엔드: GET /standard-items?q=&group=&limit=&offset= (실데이터 17,148종, CENTRAL 전용)
//   → { items: [{ standardItemId, standardCode, standardName, itemGroupId, uom, shelfLifeDays, criticality }], totalElements }
// 품목군 옵션: GET /item-groups → { items: [{ itemGroupId, name }] } (실데이터 8종)
const PAGE_SIZE = 50; // 백엔드 limit 최대 1000, 목록 가독성 위해 50건씩 서버 페이지네이션

type StdItem = {
  standardItemId: string;
  standardCode: string;
  standardName: string;
  itemGroupId: string | null;
  uom: string | null;
  shelfLifeDays: number | null;
  criticality: string | null;
};
type ItemGroup = { itemGroupId: string; name: string };

// 중요도(criticality) 뱃지 — MEDICAL(실시간)/CONSUMABLE(월주기), 그 외는 원문 표기
const CRIT_CLASS: Record<string, string> = {
  MEDICAL: "bg-accent-soft text-accent-dark",
  CONSUMABLE: "bg-paper text-ink-muted",
};
function CriticalityBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-ink-faint">—</span>;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${CRIT_CLASS[value] ?? "bg-paper text-ink-muted"}`}>
      {CRITICALITY_LABEL[value] ?? value}
    </span>
  );
}

function ItemMaster() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState(""); // 디바운스된 검색어 (요청 트리거)
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);

  // 검색어 디바운스 — 타이핑마다 요청 보내지 않도록 300ms 지연
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // 검색어·품목군이 바뀌면 첫 페이지로
  useEffect(() => setPage(1), [dq, group]);

  const groups = useApi<{ items: ItemGroup[] }>("/item-groups");
  const groupName = useMemo(() => {
    const m = new Map<string, string>();
    groups.data?.items?.forEach((g) => m.set(g.itemGroupId, g.name));
    return m;
  }, [groups.data]);

  const path = useMemo(() => {
    const qs = new URLSearchParams();
    if (dq) qs.set("q", dq);
    if (group) qs.set("group", group);
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String((page - 1) * PAGE_SIZE));
    return `/standard-items?${qs.toString()}`;
  }, [dq, group, page]);
  const res = useApi<{ items: StdItem[]; totalElements: number }>(path);

  const items = res.data?.items ?? [];
  const total = res.data?.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const anyFilter = dq !== "" || group !== "";

  return (
    <div>
      <PageTitle
        title="표준품목"
        desc="전국 SSIS 입출고 이력 기반 표준품목 마스터(실데이터 17,148종). 품목명·코드로 검색하고 품목군으로 필터합니다."
      />

      {/* 품목군 분류는 아직 키워드 휴리스틱(backend#15) — 정확도 낮을 수 있음 안내 */}
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-line bg-paper px-4 py-3 text-ink-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-ink-faint">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-xs leading-relaxed">
          품목군 분류는 키워드 기반 자동 분류라 일부 부정확할 수 있습니다. 코드·품목명은 원천 데이터 그대로이며, 품목군만 참고용입니다.
        </p>
      </div>

      <Toolbar className="mb-4">
        <Field label="검색">
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="품목명 · 코드"
            className="min-w-[220px]"
          />
        </Field>
        <Field label="품목군">
          <Select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            disabled={groups.loading || !!groups.error}
            className="min-w-[160px]"
          >
            <option value="">전체</option>
            {groups.data?.items?.map((g) => (
              <option key={g.itemGroupId} value={g.itemGroupId}>{g.name}</option>
            ))}
          </Select>
        </Field>
        {anyFilter && (
          <button
            onClick={() => { setQ(""); setGroup(""); }}
            className="self-end rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
          >
            필터 초기화
          </button>
        )}
      </Toolbar>

      <Card bodyClassName="p-0">
        {res.loading && <div className="p-4"><SkeletonTable cols={5} rows={12} /></div>}
        {res.error && <div className="p-5"><State loading={false} error={res.error} /></div>}
        {res.data && items.length === 0 && (
          <EmptyState
            title="해당 조건의 표준품목이 없습니다"
            desc={anyFilter ? "검색어나 품목군 필터를 바꿔보세요." : undefined}
          />
        )}
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>코드</Th>
                  <Th>품목명</Th>
                  <Th>품목군</Th>
                  <Th>단위</Th>
                  <Th>중요도</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((it) => (
                  <tr key={it.standardItemId} className="transition-colors hover:bg-paper">
                    <Td className="font-mono text-xs text-ink-muted">{it.standardCode}</Td>
                    <Td className="max-w-[360px]">
                      <span className="block truncate font-medium text-ink">{it.standardName}</span>
                    </Td>
                    <Td className="text-ink-muted">
                      {it.itemGroupId ? (groupName.get(it.itemGroupId) ?? it.itemGroupId) : <span className="text-ink-faint">미분류</span>}
                    </Td>
                    <Td className="text-ink-muted">{it.uom ?? <span className="text-ink-faint">—</span>}</Td>
                    <Td><CriticalityBadge value={it.criticality} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-ink-faint">
            <span>
              총 <span className="font-semibold text-ink-muted tabular-nums">{num(total)}</span>건
              {total > 0 && <> · {num(from)}–{num(to)} 표시</>}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || res.loading}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>
              <span className="tabular-nums text-ink-muted">{num(page)} / {num(totalPages)}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || res.loading}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ItemsPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <ItemMaster />
    </RequireRole>
  );
}
