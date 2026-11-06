//What to show if user has no orders,transactions or other stuff at the very start when accout is created

import {
  BriefcaseBusiness,
  ClipboardList,
  Eye,
  ReceiptText,
  Search,
} from "lucide-react";

import Button from "./Button.jsx";
import "./EmptyState.css";

// The icon for each kind of empty list
const iconMap = {
  orders: ClipboardList,
  portfolio: BriefcaseBusiness,
  watchlist: Eye,
  transactions: ReceiptText,
  search: Search,
};

// A friendly "nothing here yet" panel with an optional action button.
export default function EmptyState({
  title,
  description,
  icon = "search",
  actionLabel,
  onAction,
}) {
  const Icon = iconMap[icon] ?? iconMap.search;

  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        <Icon size={26} strokeWidth={1.6} />
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
