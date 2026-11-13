import Skeleton, { SkeletonRegion } from "../../../../components/ui/Skeleton.jsx";

// Placeholder for the stock page while the stock loads: same layout as the real page (header, main column, order panel).
export default function StockDetailsSkeleton() {
  return (
    <div className="stock-details-page">
      <SkeletonRegion label="Loading stock details">
        <section className="stock-details-page__header">
          <Skeleton height={112} radius="var(--radius-lg)" />
        </section>

        <Skeleton height={84} radius="var(--radius-lg)" />

        <div className="stock-details-page__main">
          <div className="stock-details-page__primary">
            <Skeleton height={480} radius="var(--radius-lg)" />
            <Skeleton height={200} radius="var(--radius-lg)" />
          </div>

          <aside className="stock-details-page__sidebar">
            <Skeleton height={420} radius="var(--radius-lg)" />
          </aside>
        </div>
      </SkeletonRegion>
    </div>
  );
}
