import { useContext } from "react";
import NotificationsContext from "./notificationsContext.js";

// Gives a component the notification state and actions (see NotificationsProvider for the full list)
export default function useNotifications() {
  const context = useContext(NotificationsContext);

  if (context === null) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }

  return context;
}
