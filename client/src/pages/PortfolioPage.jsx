import usePortfolio from "../features/portfolio/hooks/usePortfolio.js";

import PortfolioHeader from "../features/portfolio/components/PortfolioHeader.jsx";
import PortfolioSummaryCards from "../features/portfolio/components/PortfolioSummaryCards.jsx";
import PortfolioAllocation from "../features/portfolio/components/PortfolioAllocation.jsx";
import AccountValueChart from "../features/portfolio/components/AccountValueChart.jsx";
import HoldingsSection from "../features/portfolio/components/HoldingsSection.jsx";

import Button from "../components/ui/Button.jsx";
import { SkeletonHeading, SkeletonRegion, SkeletonStats, SkeletonTable } from "../components/ui/Skeleton.jsx";

import "./PortfolioPage.css";

export default function PortfolioPage() {
    const {
        portfolio,
        loading,
        refreshing,
        error,
        lastUpdated,
        refresh,
    } = usePortfolio();

    if (loading) {
        return (
            <section className="portfolio-page">
                <SkeletonRegion label="Loading your portfolio">
                    <SkeletonHeading />
                    <SkeletonStats count={4} />
                    <SkeletonTable columns={9} rows={5} cardsBelow={1100} />
                </SkeletonRegion>
            </section>
        );
    }

    // Only block the page when there is nothing to show; a failed refresh keeps the old data
    if (error && !portfolio) {
        return (
            <section className="portfolio-page">
                <div
                    className="portfolio-page__error portfolio-page__error--blocking"
                    role="alert"
                >
                    <p>{error}</p>

                    <Button
                        variant="secondary"
                        onClick={refresh}
                        disabled={refreshing}
                    >
                        {refreshing ? "Trying again..." : "Try again"}
                    </Button>
                </div>
            </section>
        );
    }

    const { holdings, summary } = portfolio;

    return (
        <section className="portfolio-page">
            <PortfolioHeader
                lastUpdated={lastUpdated}
                refreshing={refreshing}
                onRefresh={refresh}
            />

            {error && (
                <p className="portfolio-page__error" role="alert">
                    {error}
                </p>
            )}

            <PortfolioSummaryCards summary={summary} />

            {/* The chart shows even with no holdings left: the history of a fully sold account is still real */}
            <div className="portfolio-overview">
                {holdings.length > 0 && <PortfolioAllocation holdings={holdings} />}
                <AccountValueChart />
            </div>

            <HoldingsSection holdings={holdings} />
        </section>
    );
}
