
import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../features/auth/ProtectedRoute.jsx";

import AppLayout from "../components/layout/AppLayout.jsx";
import CurrentUserProvider from "../features/account/CurrentUserProvider.jsx";
import NotificationsProvider from "../features/notifications/NotificationsProvider.jsx";

import LoginPage from "../pages/LoginPage.jsx";
import SignupPage from "../pages/SignupPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import StocksPage from "../pages/StocksPage.jsx";
import StockDetailsPage from "../pages/StockDetailsPage.jsx";
import OrdersPage from "../pages/OrdersPage.jsx";
import PortfolioPage from "../pages/PortfolioPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import AccountPage from "../pages/AccountPage.jsx";
import WatchlistPage from "../pages/WatchlistPage.jsx";
import TransactionsPage from "../pages/TransactionsPage.jsx";

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        // The providers sit inside ProtectedRoute, so the profile is only loaded (and notifications only polled) for logged-in users
        element: (
          <CurrentUserProvider>
            <NotificationsProvider>
              <AppLayout />
            </NotificationsProvider>
          </CurrentUserProvider>
        ),
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/stocks",
            element: <StocksPage />,
          },
          {
            path: "/stocks/:stockId",
            element: <StockDetailsPage />,
          },
          {
            path: "/orders",
            element: <OrdersPage />,
          },
          {
            path: "/portfolio",
            element: <PortfolioPage />,
          },
          {
            path: "/watchlist",
            element: <WatchlistPage />,
          },
          {
            path: "/transactions",
            element: <TransactionsPage />,
          },
          {
            path: "/account",
            element: <AccountPage />,
          },
        ],
      },
    ],
  },
  {
    path:"/login",
    element:<LoginPage></LoginPage>
  },
  {
    path:"/signup",
    element:<SignupPage></SignupPage>
  },
  {
    path:"/",
    element:<LoginPage></LoginPage>
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
