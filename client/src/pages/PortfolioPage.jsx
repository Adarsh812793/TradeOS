import usePortfolio from "../features/portfolio/hooks/usePortfolio.js";

import PortfolioHeader from "../features/portfolio/components/PortfolioHeader.jsx";
import PortfolioSummaryCards from "../features/portfolio/components/PortfolioSummaryCards.jsx";
import PortfolioAllocation from "../features/portfolio/components/PortfolioAllocation.jsx";
import PortfolioValueChart from "../features/portfolio/components/PortfolioValueChart.jsx";
import HoldingsSection from "../features/portfolio/components/HoldingsSection.jsx";

import Button from "../components/ui/Button.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";

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
                <div className="portfolio-page__loading">
                    <LoadingSpinner label="Loading your portfolio..." />
                </div>
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

            {holdings.length > 0 && (
                <div className="portfolio-overview">
                    <PortfolioAllocation holdings={holdings} />
                    <PortfolioValueChart />
                </div>
            )}

            <HoldingsSection holdings={holdings} />
        </section>
    );
}
