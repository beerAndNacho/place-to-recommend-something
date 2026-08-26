export default function Loading() {
  return (
    <main className="loading-page" aria-label="장소 정보를 불러오는 중">
      <div className="loading-hero skeleton" />
      <div className="loading-grid">
        <div className="loading-list skeleton" />
        <div className="loading-map skeleton" />
      </div>
    </main>
  );
}
