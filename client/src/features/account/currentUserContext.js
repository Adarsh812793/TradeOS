
import { createContext } from "react";

// Holds the logged-in user's profile for every page inside the app layout (see CurrentUserProvider)
const CurrentUserContext = createContext(null);

export default CurrentUserContext;
