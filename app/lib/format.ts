// 라벨/색상 매핑 (위험레벨·심각도·상태·알림유형)

export const RISK_LABEL: Record<string, string> = {
  NORMAL: "정상",
  CAUTION: "주의",
  WARNING: "경계",
  CRITICAL: "심각",
};

export const RISK_CLASS: Record<string, string> = {
  NORMAL: "bg-ok-soft text-ok border-transparent",
  CAUTION: "bg-caution-soft text-caution border-transparent",
  WARNING: "bg-warn-soft text-warn border-transparent",
  CRITICAL: "bg-crit-soft text-crit border-transparent",
};

export const STATUS_LABEL: Record<string, string> = {
  OK: "정상",
  WATCH: "주의",
  BELOW_ROP: "재주문점 미달",
  CRITICAL: "긴급 부족",
  // 해당 기관이 취급하지 않거나(NOT_OPERATED) 데이터가 누락된(DATA_MISSING) 품목.
  // 재고가 0 이지만 결품이 아니므로 판정·발주 대상에서 뺀다. 사유는 zero_stock_reason 참조.
  EXCLUDED: "판정 제외",
};

export const STATUS_CLASS: Record<string, string> = {
  OK: "bg-ok-soft text-ok border-transparent",
  // 경보가 아니라 '대상 아님' 이므로 중립 톤으로 둔다(정상=녹색과도 구분).
  EXCLUDED: "bg-paper text-ink-muted border-line",
  WATCH: "bg-caution-soft text-caution border-transparent",
  BELOW_ROP: "bg-warn-soft text-warn border-transparent",
  CRITICAL: "bg-crit-soft text-crit border-transparent",
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
