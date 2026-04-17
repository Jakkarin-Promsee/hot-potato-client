import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/explore" replace /> : <>{children}</>;
};

export default PublicRoute;
