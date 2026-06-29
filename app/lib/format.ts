// 라벨/색상 매핑 (위험레벨·심각도·상태·알림유형)

export const RISK_LABEL: Record<string, string> = {
  NORMAL: "정상",
  CAUTION: "주의",
  WARNING: "경계",
  CRITICAL: "심각",
};

export const RISK_CLASS: Record<string, string> = {
  NORMAL: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CAUTION: "bg-amber-100 text-amber-700 border-amber-200",
  WARNING: "bg-orange-100 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
};

export const STATUS_LABEL: Record<string, string> = {
  OK: "정상",
  WATCH: "주의",
  BELOW_ROP: "재주문점 미달",
  CRITICAL: "긴급 부족",
};

export const STATUS_CLASS: Record<string, string> = {
  OK: "bg-emerald-100 text-emerald-700 border-emerald-200",
  WATCH: "bg-amber-100 text-amber-700 border-amber-200",
  BELOW_ROP: "bg-orange-100 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
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
  NORMAL: "bg-emerald-500",
  CAUTION: "bg-amber-500",
  WARNING: "bg-orange-500",
  CRITICAL: "bg-red-500",
};
