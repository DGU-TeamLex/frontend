"use client";
import { useApi } from "../lib/api";
import { num, riskColorBar } from "../lib/format";
import { Card, RiskBadge, State, PageTitle } from "../components/ui";

export default function SupplyRiskPage() {
  const { data, loading, error } = useApi<any>("/supply-risk");

  return (
    <div>
      <PageTitle
        title="공급위험 조기경보 (모듈 C)"
        desc="외부 신호(원자재·뉴스)를 품목군 의존도·시차로 전파한 공급위험 점수/레벨과 근거"
      />
      <State loading={loading} error={error} />
      <div className="space-y-4">
        {data?.items?.map((r: any) => (
          <Card key={r.itemGroupId}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-base font-bold text-ink">{r.itemGroupName}</h3>
                  <RiskBadge level={r.level} />
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  기준일 {r.date} · 추정 리드타임 {r.leadTimeEstimate}일 · 신뢰도 {Math.round(r.confidence * 100)}%
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-3xl font-bold lining-nums tabular-nums text-ink">{r.riskScore}</div>
                <div className="text-xs text-ink-faint">/ 100</div>
              </div>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper">
              <div className={`h-full rounded-full ${riskColorBar[r.level]}`} style={{ width: `${r.riskScore}%` }} />
            </div>

            {r.topContributors?.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">주요 기여 원재료</div>
                <div className="flex flex-wrap gap-2">
                  {r.topContributors.map((c: any, i: number) => (
                    <span key={i} className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink-muted">
                      {c.materialType} · 기여 {Math.round(c.contrib * 100)}% · 시차 {c.lagDays}일
                    </span>
                  ))}
                </div>
              </div>
            )}

            {r.evidenceNews?.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">근거 뉴스</div>
                <ul className="space-y-1">
                  {r.evidenceNews.map((n: any) => (
                    <li key={n.newsId} className="text-sm">
                      <a href={n.url} target="_blank" rel="noreferrer" className="text-ink underline-offset-2 hover:text-accent hover:underline">
                        {n.title}
                      </a>
                      <span className="ml-2 text-xs text-ink-faint">{n.publishedAt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
