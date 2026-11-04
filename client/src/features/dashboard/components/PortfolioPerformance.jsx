
/* 1. Portfolio Performance Component */
import "./PortfolioPerformance.css";

export default function PortfolioPerformance() {
  return (
    <section className="portfolio-performance">
      {/* 1.1 Card Header */}
      <div className="portfolio-performance__header">
        <div>
          <h2>Portfolio Performance</h2>
          <p>Track your investment performance over time</p>
        </div>
      </div>

      {/* 1.2 Chart Empty State */}
      <div className="portfolio-performance__empty">
        <div className="portfolio-performance__empty-icon">
          📈
        </div>

        <h3>Performance Chart Under Development</h3>

        <p>
          We're working on bringing you historical portfolio
          performance and interactive charts. Stay tuned!
        </p>
      </div>
    </section>
  );
}
