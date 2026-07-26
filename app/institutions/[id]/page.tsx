"use client";
import { useParams } from "next/navigation";
import { useApi } from "../../lib/api";
import { num } from "../../lib/format";
import {
  Card, Kpi, RiskBadge, StatusBadge, Th, Td, State,
  SkeletonStatGrid, SkeletonTable, EmptyState, PageTitle, Link,
} from "../../components/ui";
import RequireRole from "../../components/RequireRole";

function InstitutionDetail({ id }: { id: string }) {
  const fac = useApi<any>(`/facilities/${encodeURIComponent(id)}`);
  const inst = fac.data?.institution;
  const summary = fac.data?.summary;
  const inventory: any[] = fac.data?.inventory ?? [];

  return (
    <div>
      <PageTitle
        title={`기관코드 ${id}`}
        desc="기관명·지역은 매핑 정보원 확보 전까지 미표출합니다(backend#16, 잠정)."
        action={
          <Link href="/institutions" className="text-sm font-medium text-accent-dark hover:underline">
            ← 목록으로
          </Link>
        }
      />

      {fac.loading && <SkeletonStatGrid count={4} />}
      {fac.error && <State loading={false} error={fac.error} />}
      {!fac.loading && !fac.error && !inst && <EmptyState title="기관을 찾을 수 없습니다" />}

      {inst && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="기관유형" value={inst.category ?? "-"} />
            <Kpi label="추적 품목" value={num(summary?.trackedItems)} />
            <Kpi
              label="긴급부족"
              value={num(summary?.critical)}
              tone={Number(summary?.critical ?? 0) > 0 ? "danger" : "default"}
            />
            <Kpi
              label="발주 필요"
              value={num(summary?.orderNeeded)}
              tone={Number(summary?.orderNeeded ?? 0) > 0 ? "warn" : "default"}
            />
          </div>

          <Card bodyClassName="p-0">
            {inventory.length === 0 && <EmptyState title="재고 데이터가 없습니다" />}
            {inventory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <Th>품목</Th>
                      <Th className="text-right">현재고</Th>
                      <Th className="text-right">가용</Th>
                      <Th className="text-right">ROP</Th>
                      <Th className="text-right">발주권고</Th>
                      <Th>위험</Th>
                      <Th>상태</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {inventory.map((r, i) => (
                      <tr key={i} className="transition-colors hover:bg-paper">
                        <Td className="max-w-[220px]">
                          <span className="block truncate font-medium text-ink">{r.standardName}</span>
                          <span className="font-mono text-xs text-ink-faint">{r.standardCode}</span>
                        </Td>
                        <Td className="text-right">{num(r.onHand)}</Td>
                        <Td className="text-right font-semibold">{num(r.available)}</Td>
                        <Td className="text-right text-ink-muted">{num(r.ROP)}</Td>
                        <Td className="text-right">{num(r.orderRecommendation)}</Td>
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
        </>
      )}
    </div>
  );
}

export default function InstitutionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <RequireRole roles={["CENTRAL"]}>
      <InstitutionDetail id={id} />
    </RequireRole>
  );
}
