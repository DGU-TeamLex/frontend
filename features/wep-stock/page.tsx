import StockList from "./components/StockList";

export default function WepStockPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-2">WeP-Stock</h1>
      <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-6">
        ⚠️ 자동 생성 초안입니다. 첨부 PDF 명세서를 참고해 실제 구현으로 교체하세요.
      </p>
      <StockList />
    </main>
  );
}
