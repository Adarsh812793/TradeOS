
import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../features/auth/ProtectedRoute.jsx";
import GuestRoute from "../features/auth/GuestRoute.jsx";

import AppLayout from "../components/layout/AppLayout.jsx";
import AppLoading from "../components/layout/AppLoading.jsx";
import RouteError from "../components/layout/RouteError.jsx";
import CurrentUserProvider from "../features/account/CurrentUserProvider.jsx";
import NotificationsProvider from "../features/notifications/NotificationsProvider.jsx";
import MarketStatusProvider from "../features/market/MarketStatusProvider.jsx";

import NotFoundPage from "../pages/NotFoundPage.jsx";

// Every page is its own file that downloads only when the page is first opened, so the first visit (for example the
// login page) does not have to download the whole app. While a page downloads, the current page stays on screen and
// AppLayout shows a thin progress bar (React Router reports that as navigation.state === "loading").
// Use it like:  { path: "/orders", ...page(() => import("../pages/OrdersPage.jsx")) }
const page = (importPage) => ({
  lazy: async () => ({ Component: (await importPage()).default }),
});

const router = createBrowserRouter([
  {
    // Anything the routes below cannot handle themselves ends up on a friendly screen, never React Router's raw error page
    errorElement: <RouteError fullPage />,
    // Shown only while the very first page's code downloads (before any layout exists)
    hydrateFallbackElement: <AppLoading />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            // The providers sit inside ProtectedRoute, so the profile is only loaded (and notifications only polled) for logged-in users
            element: (
              <CurrentUserProvider>
                <NotificationsProvider>
                  <MarketStatusProvider>
                    <AppLayout />
                  </MarketStatusProvider>
                </NotificationsProvider>
              </CurrentUserProvider>
            ),
            children: [
              {
                // An error inside a page (a crash, or its code failing to download) replaces only the page:
                // the navigation around it keeps working
                errorElement: <RouteError />,
                children: [
                  { path: "/dashboard", ...page(() => import("../pages/DashboardPage.jsx")) },
                  { path: "/stocks", ...page(() => import("../pages/StocksPage.jsx")) },
                  { path: "/stocks/:stockId", ...page(() => import("../pages/StockDetailsPage.jsx")) },
                  { path: "/orders", ...page(() => import("../pages/OrdersPage.jsx")) },
                  { path: "/portfolio", ...page(() => import("../pages/PortfolioPage.jsx")) },
                  { path: "/watchlist", ...page(() => import("../pages/WatchlistPage.jsx")) },
                  { path: "/transactions", ...page(() => import("../pages/TransactionsPage.jsx")) },
                  { path: "/account", ...page(() => import("../pages/AccountPage.jsx")) },
                ],
              },
            ],
          },
        ],
      },
      // Component gallery: only exists in development (Vite removes this, and the page, from production builds)
      ...(import.meta.env.DEV
        ? [{ path: "/dev/ui", ...page(() => import("../pages/dev/UiGalleryPage.jsx")) }]
        : []),
      {
        // The pages made for visitors: a user who is already logged in is sent to the dashboard instead
        element: <GuestRoute />,
        children: [
          { path: "/", ...page(() => import("../pages/LandingPage.jsx")) },
          { path: "/login", ...page(() => import("../pages/LoginPage.jsx")) },
          { path: "/signup", ...page(() => import("../pages/SignupPage.jsx")) },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default router;
