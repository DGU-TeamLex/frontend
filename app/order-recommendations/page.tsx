"use client";
import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { num } from "../lib/format";
import {
  Card, Toolbar, Field, TextInput, RiskBadge, StatusBadge,
  Th, Td, State, SkeletonTable, EmptyState, PageTitle,
} from "../components/ui";
import RequireRole from "../components/RequireRole";

// 표준품명에서 세부품목(규격) 토큰을 근사 추출한다 — inventory 테이블에 별도 규격
// 컬럼이 아직 없어(backend#43) 이름 문자열에서 정규식으로 뽑는 임시 처리.
const SPEC_RE = /(\d+(?:\.\d+)?\s?(?:cc|CC|mL|ML|ml|L|리터|kg|g|mg|정|캡슐))/;
function specOf(name: string | undefined | null): string | null {
  if (!name) return null;
  const m = name.match(SPEC_RE);
  return m ? m[1].replace(/\s+/g, "") : null;
}

function OrderRecoTable() {
  const [institution, setInstitution] = useState("");
  const [fItem, setFItem] = useState("");
  const path = "/order-recommendations" + (institution ? `?institution=${encodeURIComponent(institution)}` : "");
  const reco = useApi<any>(path);
  const rawItems: any[] = reco.data?.items ?? [];

  const rows = useMemo(() => {
    return rawItems
      .map((r) => ({ ...r, spec: specOf(r.standardName) }))
      .filter((r) => {
        if (!fItem) return true;
        return `${r.standardName ?? ""} ${r.standardCode ?? ""} ${r.spec ?? ""}`
          .toLowerCase()
          .includes(fItem.toLowerCase());
      });
  }, [rawItems, fItem]);

  const bySpec = useMemo(() => {
    const m = new Map<string, { count: number; qty: number }>();
    for (const r of rows) {
      const key = r.spec ?? "기타(규격 미상)";
      const cur = m.get(key) ?? { count: 0, qty: 0 };
      cur.count += 1;
      cur.qty += Number(r.recommendedQty ?? 0);
      m.set(key, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].qty - a[1].qty);
  }, [rows]);

  return (
    <div>
      <Toolbar className="mb-4">
        <Field label="기관코드">
          <TextInput
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="전체"
            className="w-40"
          />
        </Field>
        <Field label="품목·규격 검색">
          <TextInput
            value={fItem}
            onChange={(e) => setFItem(e.target.value)}
            placeholder="품목명·코드·규격"
            className="w-56"
          />
        </Field>
      </Toolbar>

      {bySpec.length > 0 && (
        <Card title="규격별 발주권고 집계" className="mb-4">
          <div className="flex flex-wrap gap-2">
            {bySpec.map(([spec, s]) => (
              <span
                key={spec}
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink-muted"
              >
                <span className="font-semibold text-ink">{spec}</span> · {s.count}건 · 합계 {num(s.qty)}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card bodyClassName="p-0">
        {reco.loading && (
          <div className="p-4">
            <SkeletonTable cols={9} rows={10} />
          </div>
        )}
        {reco.error && (
          <div className="p-5">
            <State loading={false} error={reco.error} />
          </div>
        )}
        {reco.data && rows.length === 0 && (
          <EmptyState title="발주 권고 대상이 없습니다" desc="검색 조건을 바꿔보세요." />
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>기관</Th>
                  <Th>품목</Th>
                  <Th>규격</Th>
                  <Th className="text-right">가용</Th>
                  <Th className="text-right">ROP</Th>
                  <Th className="text-right">Target</Th>
                  <Th className="text-right">발주권고</Th>
                  <Th>위험</Th>
                  <Th>상태</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, i) => (
                  <tr key={i} className="transition-colors hover:bg-paper">
                    <Td className="max-w-[160px]">
                      <span className="block truncate text-ink-muted">
                        {r.institutionName ?? r.institutionId}
                      </span>
                    </Td>
                    <Td className="max-w-[220px]">
                      <span className="block truncate font-medium text-ink">{r.standardName}</span>
                      <span className="font-mono text-xs text-ink-faint">{r.standardCode}</span>
                    </Td>
                    <Td>
                      {r.spec ? (
                        <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-dark">
                          {r.spec}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-faint">-</span>
                      )}
                    </Td>
                    <Td className="text-right">{num(r.available)}</Td>
                    <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                    <Td className="text-right text-ink-muted">{num(r.target)}</Td>
                    <Td className="text-right">
                      <span className="font-bold text-accent-dark">{num(r.recommendedQty)}</span>
                    </Td>
                    <Td>
                      {r.supplyRiskLevel && r.supplyRiskLevel !== "NORMAL" ? (
                        <RiskBadge level={r.supplyRiskLevel} />
                      ) : (
                        <span className="text-xs text-ink-faint">정상</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function OrderRecommendationsPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <PageTitle
        title="발주권고 (세부품목 단위)"
        desc="전국 발주 권고 수량을 세부품목(규격) 단위로 표기합니다. 수치는 현재 backend SS/ROP 계산 결과이며, ai 서빙 API 배포 후 그 결과를 소비하도록 교체될 예정입니다(backend#43)."
      />
      <OrderRecoTable />
    </RequireRole>
  );
}
