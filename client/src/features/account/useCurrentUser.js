
import { useContext } from "react";
import CurrentUserContext from "./currentUserContext.js";

// Gives a component the logged-in user's profile: { user, setUser, loading, error, retry }
export default function useCurrentUser() {
  const context = useContext(CurrentUserContext);

  if (context === null) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }

  return context;
}
