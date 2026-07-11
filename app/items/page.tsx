"use client";
import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { CRITICALITY_LABEL } from "../lib/format";
import { Card, Th, Td, State, PageTitle, SkeletonTable, EmptyState } from "../components/ui";
import RequireRole from "../components/RequireRole";

type ItemGroup = { itemGroupId: string; name: string };
type StandardItem = {
  standardItemId: string;
  standardCode: string;
  standardName: string;
  itemGroupId: string;
  uom: string;
  shelfLifeDays: number | null;
  criticality: string;
};

function ItemSearch() {
  // 입력값(draft)과 실제 조회에 반영된 값(applied)을 분리 — 검색어는 제출 시에만,
  // 품목군 필터는 선택 즉시 반영한다.
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");

  const groupsRes = useApi<{ items: ItemGroup[] }>("/item-groups");
  const groups = groupsRes.data?.items ?? [];
  const groupName = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.itemGroupId, g.name])),
    [groups],
  );

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (group) params.set("group", group);
  const path = `/standard-items${params.toString() ? `?${params.toString()}` : ""}`;
  const { data, loading, error } = useApi<{ items: StandardItem[]; totalElements: number }>(path);
  const rows = data?.items ?? [];

  return (
    <div>
      <PageTitle
        title="표준품목 마스터 검색"
        desc="한국사회보장정보원(SSIS) 실데이터 기준 표준품목 카탈로그(17,148종). 검색어·품목군으로 조회합니다."
      />

      {/* 품목군 분류가 아직 키워드 휴리스틱이라 부정확할 수 있음 (backend#15) */}
      <div className="mb-4 rounded-lg border border-caution/40 bg-caution-soft px-4 py-3 text-sm text-caution">
        <span className="font-bold">안내</span>
        <span className="ml-1.5 text-caution/90">
          품목군·중요도 분류는 아직 키워드 휴리스틱 기반이라 부정확할 수 있습니다(예: “구강세정기”가
          내복약으로 오분류). 데이터 정의서 확보 후 재작업 예정입니다.
        </span>
      </div>

      <Card
        title="검색 조건"
        className="mb-5"
      >
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(draftQ.trim());
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">검색어 (품목명·코드)</span>
            <input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="예: 주사기, 장갑, USE0000001"
              className="w-64 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">품목군</span>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-52 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">전체 품목군</option>
              {groups.map((g) => (
                <option key={g.itemGroupId} value={g.itemGroupId}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            검색
          </button>
          {(q || group) && (
            <button
              type="button"
              onClick={() => {
                setDraftQ("");
                setQ("");
                setGroup("");
              }}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              초기화
            </button>
          )}
        </form>
      </Card>

      {error && <State loading={false} error={error} />}
      {loading && (
        <Card title="검색 결과">
          <SkeletonTable cols={5} rows={8} />
        </Card>
      )}
      {data && (
        <Card title={`검색 결과 (${data.totalElements.toLocaleString("ko-KR")}건)`}>
          {rows.length === 0 ? (
            <EmptyState
              title="조건에 맞는 표준품목이 없습니다"
              desc="검색어나 품목군 필터를 바꿔보세요."
            />
          ) : (
            <>
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
                    {rows.map((r) => (
                      <tr key={r.standardItemId}>
                        <Td className="font-mono text-xs text-ink-muted">{r.standardCode}</Td>
                        <Td className="font-medium">{r.standardName}</Td>
                        <Td className="text-xs text-ink-muted">
                          {groupName[r.itemGroupId] ?? r.itemGroupId}
                        </Td>
                        <Td className="text-ink-muted">{r.uom}</Td>
                        <Td className="text-xs text-ink-muted">
                          {CRITICALITY_LABEL[r.criticality] ?? r.criticality}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.totalElements > rows.length && (
                <p className="mt-3 text-xs text-ink-faint">
                  전체 {data.totalElements.toLocaleString("ko-KR")}건 중 상위 {rows.length.toLocaleString("ko-KR")}건만
                  표시합니다. 검색어·품목군으로 범위를 좁혀주세요.
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ItemsPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <ItemSearch />
    </RequireRole>
  );
}
