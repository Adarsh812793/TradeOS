// The app's navigation, defined once and shared by the icon rail (desktop and tablet) and the bottom bar (phones).
import {
  BriefcaseBusiness,
  ChartCandlestick,
  ClipboardList,
  Eye,
  LayoutDashboard,
  ReceiptText,
  UserRound,
} from "lucide-react";

const DASHBOARD = { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard };
const STOCKS = { label: "Stocks", path: "/stocks", icon: ChartCandlestick };
const PORTFOLIO = { label: "Portfolio", path: "/portfolio", icon: BriefcaseBusiness };
const ORDERS = { label: "Orders", path: "/orders", icon: ClipboardList };
const WATCHLIST = { label: "Watchlist", path: "/watchlist", icon: Eye };
const TRANSACTIONS = { label: "Transactions", path: "/transactions", icon: ReceiptText };
export const ACCOUNT = { label: "Account", path: "/account", icon: UserRound };

// Icon rail: the six main pages, with Account pinned at the bottom
export const RAIL_ITEMS = [DASHBOARD, STOCKS, PORTFOLIO, ORDERS, WATCHLIST, TRANSACTIONS];

// Phone bottom bar: the four most used pages, then "More"
export const BOTTOM_ITEMS = [DASHBOARD, STOCKS, PORTFOLIO, ORDERS];

// What "More" opens on phones
export const MORE_ITEMS = [WATCHLIST, TRANSACTIONS, ACCOUNT];
