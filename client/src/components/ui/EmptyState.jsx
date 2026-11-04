//What to show if user has no orders,transactions or other stuff at the very start when accout is created

import Button from "./Button.jsx";
import "./EmptyState.css";

const iconMap = {
  orders: "file-text",
  portfolio: "chart-no-axes-combined",
  watchlist: "bookmark",
  search: "search",
};

export default function EmptyState({
  title,
  description,
  icon = "search",
  actionLabel,
  onAction,
}) {
  const iconName = iconMap[icon] ?? iconMap.search;

  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        <span className={`empty-state__symbol empty-state__symbol--${icon}`}>
          {iconName === "file-text" && "▤"}
          {iconName === "chart-no-axes-combined" && "↗"}
          {iconName === "bookmark" && "♡"}
          {iconName === "search" && "⌕"}
        </span>
      </div>

      <h2 className="empty-state__title">{title}</h2>

      {description && (
        <p className="empty-state__description">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
