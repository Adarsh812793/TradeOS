import { createContext } from "react";

// Holds the notification state and actions for every page inside the app layout (see NotificationsProvider)
const NotificationsContext = createContext(null);

export default NotificationsContext;
