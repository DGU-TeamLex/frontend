"use client";
import { useRef, useState } from "react";
import { num } from "../lib/format";

/**
 * 재고 소진 예상 곡선.
 *
 * 단일 시리즈(재고 투영선)라 범례 없이 제목이 시리즈를 지칭하고, 기준선은 전부 직접 라벨.
 * 색 배정 원칙:
 *  - 투영선  : 브랜드 액센트(teal) — 유일한 데이터 시리즈
 *  - ROP     : warn 파선 — "발주 시점" 트리거
 *  - SS      : 선이 아니라 '위험 구역 음영' — ROP와 색이 인접해 구분 실패하므로 마크 종류를 분리
 *  - 리드타임: 중립 수직 파선 — 상태색이 아닌 주석
 */
export default function DepletionChart({
  available, mu, SS, ROP, leadTime, uom = "",
}: {
  available: number; mu: number; SS: number; ROP: number; leadTime: number; uom?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ day: number; qty: number } | null>(null);

  const W = 560, H = 210;
  const padL = 48, padR = 18, padT = 14, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const dailyMu = mu > 0 ? mu : 0;
  const dts = dailyMu > 0 ? available / dailyMu : Infinity;      // 소진까지 일수
  const finite = Number.isFinite(dts);
  const xMax = Math.max(finite ? dts * 1.25 : 60, leadTime * 1.4, 7);
  const yMax = Math.max(available, ROP, SS, 1) * 1.15;

  const x = (d: number) => padL + (Math.min(d, xMax) / xMax) * plotW;
  const y = (v: number) => padT + (1 - Math.min(v, yMax) / yMax) * plotH;

  const endDay = finite ? Math.min(dts, xMax) : xMax;
  const endQty = finite ? 0 : Math.max(0, available - dailyMu * xMax);

  function onMove(e: React.MouseEvent) {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    if (px < padL || px > W - padR) { setHover(null); return; }
    const day = ((px - padL) / plotW) * xMax;
    setHover({ day, qty: Math.max(0, available - dailyMu * day) });
  }

  const yTicks = [0, yMax / 2, yMax];

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`재고 소진 예상: 현재 가용 ${Math.round(available)}, 일평균 수요 ${mu.toFixed(2)}, ${finite ? `약 ${Math.round(dts)}일 후 소진` : "수요 없음"}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* 안전재고(SS) 미만 = 위험 구역 음영 (선이 아닌 면으로 분리) */}
        {SS > 0 && (
          <>
            <rect x={padL} y={y(SS)} width={plotW} height={Math.max(0, y(0) - y(SS))} fill="#FBEAE7" />
            <line x1={padL} x2={padL + plotW} y1={y(SS)} y2={y(SS)} stroke="#BC4A3C" strokeWidth="1" strokeOpacity="0.35" />
          </>
        )}

        {/* 눈금 (약하게) */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} stroke="#DEE5E3" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-faint" fontSize="10">{num(Math.round(t))}</text>
          </g>
        ))}

        {/* ROP 기준선 — 발주 트리거 */}
        {ROP > 0 && ROP < yMax && (
          <>
            <line x1={padL} x2={padL + plotW} y1={y(ROP)} y2={y(ROP)} stroke="#C06A1E" strokeWidth="2" strokeDasharray="6 4" />
            <text x={padL + plotW} y={y(ROP) - 6} textAnchor="end" fontSize="10" fontWeight="700" fill="#C06A1E">ROP {num(Math.round(ROP))}</text>
          </>
        )}

        {/* 리드타임 수직 마커 — 상태색 아닌 중립 주석 */}
        {leadTime > 0 && leadTime < xMax && (
          <>
            <line x1={x(leadTime)} x2={x(leadTime)} y1={padT} y2={y(0)} stroke="#96A3A8" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x={x(leadTime) + 4} y={padT + 10} fontSize="10" fill="#5C6B72">리드타임 {Math.round(leadTime)}일</text>
          </>
        )}

        {/* 재고 투영선 (단일 시리즈) */}
        <line x1={x(0)} y1={y(available)} x2={x(endDay)} y2={y(endQty)} stroke="#0E7C86" strokeWidth="2" strokeLinecap="round" />
        {finite && dts < xMax && (
          <line x1={x(dts)} y1={y(0)} x2={x(xMax)} y2={y(0)} stroke="#0E7C86" strokeWidth="2" strokeOpacity="0.25" strokeDasharray="4 4" />
        )}

        {/* 소진 지점 마커 (표면 링으로 겹침 분리) */}
        {finite && dts <= xMax && (
          <>
            <circle cx={x(dts)} cy={y(0)} r="5.5" fill="#0E7C86" stroke="#FFFFFF" strokeWidth="2" />
            <text x={x(dts)} y={y(0) - 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0E7C86">
              소진 D+{Math.round(dts)}
            </text>
          </>
        )}

        {/* 축 */}
        <line x1={padL} x2={padL + plotW} y1={y(0)} y2={y(0)} stroke="#DEE5E3" strokeWidth="1.5" />
        <text x={padL} y={H - 8} fontSize="10" className="fill-ink-faint">오늘</text>
        <text x={padL + plotW} y={H - 8} textAnchor="end" fontSize="10" className="fill-ink-faint">D+{Math.round(xMax)}일</text>

        {/* 호버 크로스헤어 */}
        {hover && (
          <>
            <line x1={x(hover.day)} x2={x(hover.day)} y1={padT} y2={y(0)} stroke="#1C2530" strokeWidth="1" strokeOpacity="0.25" />
            <circle cx={x(hover.day)} cy={y(hover.qty)} r="4" fill="#0E7C86" stroke="#FFFFFF" strokeWidth="2" />
          </>
        )}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-card"
          style={{ left: `${(x(hover.day) / W) * 100}%`, top: 0 }}
        >
          <div className="font-semibold text-ink">D+{Math.round(hover.day)}일</div>
          <div className="tabular-nums text-ink-muted">예상 재고 {num(Math.round(hover.qty))}{uom}</div>
        </div>
      )}
    </div>
  );
}
