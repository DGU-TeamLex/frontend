// 라벨/색상 매핑 (위험레벨·심각도·상태·알림유형)

export const RISK_LABEL: Record<string, string> = {
  NORMAL: "정상",
  CAUTION: "주의",
  WARNING: "경계",
  CRITICAL: "심각",
};

// 상태 표기는 알약형 파스텔 배지 대신 '좌측 굵은 선 + 글자색'으로 한다.
// 표 안에 배지가 수십 개 깔리면 배경색이 데이터보다 먼저 읽힌다.
export const RISK_CLASS: Record<string, string> = {
  NORMAL: "border-l-ok text-ok",
  CAUTION: "border-l-caution text-caution",
  WARNING: "border-l-warn text-warn",
  CRITICAL: "border-l-crit text-crit",
};

export const STATUS_LABEL: Record<string, string> = {
  OK: "정상",
  WATCH: "주의",
  BELOW_ROP: "재주문점 미달",
  CRITICAL: "긴급 부족",
  // 해당 기관이 취급하지 않거나(NOT_OPERATED) 데이터가 누락된(DATA_MISSING) 품목.
  // 재고가 0 이지만 결품이 아니므로 판정·발주 대상에서 뺀다(ai#38).
  EXCLUDED: "판정 제외",
};

export const STATUS_CLASS: Record<string, string> = {
  OK: "border-l-ok text-ok",
  WATCH: "border-l-caution text-caution",
  BELOW_ROP: "border-l-warn text-warn",
  CRITICAL: "border-l-crit text-crit",
  // 판정 제외(ai#38) — 경보가 아니므로 색을 주지 않는다.
  EXCLUDED: "border-l-line text-ink-faint",
};

export const ALERT_TYPE_LABEL: Record<string, string> = {
  STOCK_BELOW_ROP: "재고미달",
  SUPPLY_RISK: "공급위험",
  EXPIRY: "유효기간임박",
};

export const INST_TYPE_LABEL: Record<string, string> = {
  HEALTH_CENTER: "보건소",
  BRANCH: "보건지소",
  CLINIC: "진료소",
};

export const CRITICALITY_LABEL: Record<string, string> = {
  MEDICAL: "의료용품(실시간)",
  CONSUMABLE: "소모품(월주기)",
};

export const num = (n: number | undefined | null) =>
  n == null ? "-" : n.toLocaleString("ko-KR");

export const riskColorBar: Record<string, string> = {
  NORMAL: "bg-ok",
  CAUTION: "bg-caution",
  WARNING: "bg-warn",
  CRITICAL: "bg-crit",
};
