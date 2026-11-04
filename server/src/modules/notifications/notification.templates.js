// Builds the title / message / link text for each notification type.
// All wording lives here, so services only say WHAT happened and never worry about HOW it reads.
import { NOTIFICATION_TYPES, LOW_BALANCE_THRESHOLD } from "./notification.constants.js";

// Formats a number as rupees with Indian digit grouping, e.g. ₹1,00,000.00
const inr = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(value);

// A buy or sell order was executed
export const orderExecutedTemplate = ({ orderType, symbol, quantity, price, totalValue, orderId, stockId }) => {
    const isBuy = orderType === "BUY";

    return {
        type: NOTIFICATION_TYPES.ORDER_EXECUTED,
        title: "Order executed",
        message: isBuy
            ? `Bought ${quantity} × ${symbol} at ${inr(price)}. Total ${inr(totalValue)}.`
            : `Sold ${quantity} × ${symbol} at ${inr(price)}. ${inr(totalValue)} added to your wallet.`,
        link: "/orders",
        metadata: { orderId, stockId }
    };
};

// A new account was created
export const welcomeTemplate = ({ startingBalance }) => ({
    type: NOTIFICATION_TYPES.WELCOME,
    title: "Welcome to TradeOS",
    message: `Your wallet is loaded with ${inr(startingBalance)} of virtual money. Explore stocks and place your first order.`,
    link: "/stocks"
});

// A buy pushed the wallet below the low-balance threshold
export const lowBalanceTemplate = ({ balance }) => ({
    type: NOTIFICATION_TYPES.LOW_BALANCE,
    title: "Low wallet balance",
    message: `Your balance is ${inr(balance)}, below ${inr(LOW_BALANCE_THRESHOLD)}. Sell some holdings to free up cash.`,
    link: "/portfolio"
});

// The user changed their password
export const passwordChangedTemplate = () => ({
    type: NOTIFICATION_TYPES.PASSWORD_CHANGED,
    title: "Password changed",
    message: "Your password was changed and your other devices were signed out. If this was not you, contact support.",
    link: "/account"
});
