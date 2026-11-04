import companyProfiles from "../../data/companyProfiles.js";
import "./CompanyInfo.css";

export default function CompanyInfo({ stock }) {
  const profile = companyProfiles[stock.symbol] || {};

  return (
    <section className="company-info">
      <h2>About {stock.companyName}</h2>

      <p className="company-description">
        {profile.description ||
          `${stock.companyName} is listed on ${stock.exchange}.`}
      </p>

      <div className="company-info-grid">
        <div>
          <span>Sector</span>
          <strong>{profile.sector || "—"}</strong>
        </div>

        <div>
          <span>Industry</span>
          <strong>{profile.industry || "—"}</strong>
        </div>

        <div>
          <span>Market Cap</span>
          <strong>{profile.marketCap || "—"}</strong>
        </div>

        <div>
          <span>Exchange</span>
          <strong>{stock.exchange || "—"}</strong>
        </div>
      </div>

      {profile.website && (
        <a
          href={profile.website}
          target="_blank"
          rel="noreferrer"
          className="company-website"
        >
          Visit Company Website ↗
        </a>
      )}
    </section>
  );
}