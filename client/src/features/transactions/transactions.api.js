
import api from "../../lib/api.js";

const TRANSACTIONS_BASE_URL = "/api/transactions";

// Get the user's paginated transactions, newest first
export const getTransactions = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();

  const url = queryString
    ? `${TRANSACTIONS_BASE_URL}?${queryString}`
    : TRANSACTIONS_BASE_URL;

  return api.get(url);
};
