// The four notification types in version 1 (the frontend picks an icon per type)
export const NOTIFICATION_TYPES = {
    ORDER_EXECUTED: "ORDER_EXECUTED",
    WELCOME: "WELCOME",
    LOW_BALANCE: "LOW_BALANCE",
    PASSWORD_CHANGED: "PASSWORD_CHANGED"
};

// A buy that takes the wallet from at/above this amount to below it creates a LOW_BALANCE notification
export const LOW_BALANCE_THRESHOLD = 5000;

// MongoDB deletes a notification this many days after it was created (TTL index)
export const NOTIFICATION_TTL_DAYS = 30;
