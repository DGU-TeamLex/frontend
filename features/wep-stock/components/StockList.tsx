"use client";

import { useEffect, useState } from "react";
import type { Stock } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function StockList() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/stocks`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Stock[]) => setStocks(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">로딩 중…</p>;
  if (error) return <p className="text-red-500">API 오류: {error}</p>;
  if (!stocks.length) return <p className="text-gray-400">데이터 없음</p>;

  return (
    <ul className="space-y-2">
      {stocks.map((s) => (
        <li key={s.id} className="border rounded p-3 hover:bg-gray-50">
          <span className="font-mono font-semibold">{s.ticker}</span>
          <span className="ml-2 text-gray-700">{s.name}</span>
          {s.description && (
            <p className="text-sm text-gray-500 mt-1">{s.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
