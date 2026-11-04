
import { useCallback, useEffect, useState } from "react";

import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner.jsx";

import { formatCurrency } from "../../../../utils/currency.utils.js";
import accountApi from "../../account.api.js";

import "./TradingAccountDetails.css";

// Body of the Trading Account section (read-only): account type, virtual balance and status.
// The wallet is fetched when the section is first opened.
export default function TradingAccountDetails() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Changing this number re-runs the effect below, which loads the wallet again
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    // Prevents state updates after the section has been left
    let isMounted = true;

    async function fetchWallet() {
      try {
        setLoading(true);
        setError("");

        const response = await accountApi.getWallet();

        if (isMounted) {
          setWallet(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your trading account.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchWallet();

    return () => {
      isMounted = false;
    };
  }, [retryKey]);

  // Tries the request again after a failure
  const retry = useCallback(() => {
    setRetryKey((key) => key + 1);
  }, []);

  if (loading) {
    return (
      <div className="trading-account__state">
        <LoadingSpinner label="Loading your trading account..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="trading-account__error" role="alert">
        <p>{error}</p>

        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <dl className="trading-account">
      <div className="trading-account__item">
        <dt>Account type</dt>
        <dd className="trading-account__value">Paper Trading</dd>
        <p className="trading-account__note">
          Practice with virtual money. No real funds are involved.
        </p>
      </div>

      <div className="trading-account__item">
        <dt>Virtual balance</dt>
        <dd className="trading-account__value trading-account__value--balance">
          {formatCurrency(wallet.balance, wallet.currency)}
        </dd>
        <p className="trading-account__note">Cash available to trade with.</p>
      </div>

      <div className="trading-account__item">
        <dt>Account status</dt>
        <dd className="trading-account__value">
          <Badge variant="success">Active</Badge>
        </dd>
        <p className="trading-account__note">Your account is in good standing.</p>
      </div>
    </dl>
  );
}
