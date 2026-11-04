
import api from "../../lib/api.js";

const ORDERS_BASE_URL = "/api/orders";

// Get paginated user orders
export const getOrders = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();

  const url = queryString
    ? `${ORDERS_BASE_URL}?${queryString}`
    : ORDERS_BASE_URL;

  return api.get(url);
};

// Create Buy Order
export const createBuyOrder = ({ stockId, quantity }) => {
  return api.post(ORDERS_BASE_URL, {
    stockId,
    quantity,
  });
};

// Create Sell Order
export const createSellOrder = ({ stockId, quantity }) => {
  return api.post(`${ORDERS_BASE_URL}/sell`, {
    stockId,
    quantity,
  });
};
