import Skeleton, { SkeletonRegion } from "../../../../components/ui/Skeleton.jsx";

// Placeholder for the stock page while the stock loads: same layout as the real page (header, main column, order panel).
export default function StockDetailsSkeleton() {
  return (
    <div className="stock-details-page">
      <SkeletonRegion label="Loading stock details">
        <section className="stock-details-page__header">
          <Skeleton height={112} radius="var(--radius-lg)" />
        </section>

        <div className="stock-details-page__main">
          <div className="stock-details-page__primary">
            <Skeleton height={180} radius="var(--radius-lg)" />
            <Skeleton height={320} radius="var(--radius-lg)" />
          </div>

          <aside className="stock-details-page__sidebar">
            <Skeleton height={420} radius="var(--radius-lg)" />
          </aside>
        </div>
      </SkeletonRegion>
    </div>
  );
}
