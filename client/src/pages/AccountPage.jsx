import {
  Settings,
  ShieldCheck,
  TriangleAlert,
  User,
  Wallet,
} from "lucide-react";

import useCurrentUser from "../features/account/useCurrentUser.js";

import AccountSection from "../features/account/components/AccountSection.jsx";
import SectionPlaceholder from "../features/account/components/SectionPlaceholder.jsx";
import PersonalInformation from "../features/account/components/personal/PersonalInformation.jsx";
import SecurityPanel from "../features/account/components/security/SecurityPanel.jsx";
import TradingAccountDetails from "../features/account/components/trading/TradingAccountDetails.jsx";
import DeleteAccountPanel from "../features/account/components/danger/DeleteAccountPanel.jsx";

import Button from "../components/ui/Button.jsx";
import { SkeletonList, SkeletonRegion } from "../components/ui/Skeleton.jsx";

import "./AccountPage.css";

// Account page: five collapsible sections (personal info, security, trading account, preferences, danger zone)
export default function AccountPage() {
  const { user, setUser, loading, error, retry } = useCurrentUser();

  return (
    <section className="account-page">
      <header className="account-page__header">
        <h1 className="account-page__title">Account</h1>
        <p className="account-page__subtitle">
          Manage your profile, security and TradeOS preferences.
        </p>
      </header>

      {loading && (
        <SkeletonRegion label="Loading your account">
          <SkeletonList rows={5} rowHeight={70} />
        </SkeletonRegion>
      )}

      {!loading && error && (
        <div className="account-page__error" role="alert">
          <p>{error}</p>

          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && user && (
        <div className="account-page__sections">
          <AccountSection
            icon={User}
            title="Personal Information"
            hint="Profile details"
          >
            <PersonalInformation user={user} onUserUpdated={setUser} />
          </AccountSection>

          <AccountSection
            icon={ShieldCheck}
            title="Security"
            hint="Password & access"
          >
            <SecurityPanel />
          </AccountSection>

          <AccountSection
            icon={Wallet}
            title="Trading Account"
            hint="Virtual account"
          >
            <TradingAccountDetails />
          </AccountSection>

          <AccountSection
            icon={Settings}
            title="Preferences"
            hint="App settings"
          >
            <SectionPlaceholder>
              Preferences such as theme and notifications are coming later.
            </SectionPlaceholder>
          </AccountSection>

          <AccountSection
            icon={TriangleAlert}
            title="Danger Zone"
            hint="Account deletion"
            variant="danger"
          >
            <DeleteAccountPanel />
          </AccountSection>
        </div>
      )}
    </section>
  );
}
