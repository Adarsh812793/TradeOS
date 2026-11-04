//Complete reusable badge
//Uses 1.Order Status 2.Stock moment
import "./Badge.css";

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}) {
  const badgeClass = `badge badge--${variant} ${className}`.trim();

  return (
    <span className={badgeClass}>
      {children}
    </span>
  );
}
