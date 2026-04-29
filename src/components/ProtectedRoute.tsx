import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../context/AuthContext";

interface ProtectedRouteProps {
  requiredRole?: Role;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { role } = useAuth();

  if (!role) return <Navigate to="/admin-login" replace />;
  if (requiredRole && role !== requiredRole && role !== "admin") {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
