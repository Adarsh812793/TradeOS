
import { AuthProvider } from "../features/auth/AuthContext.jsx";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
