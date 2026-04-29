import React, { createContext, useContext, useState } from "react";

export type Role = "admin" | "os" | "wi" | "dpo" | "sr-dpo" | null;
export type Institute = "malda" | "sahibganj" | "bhagalpur" | null;

interface AuthContextType {
  role: Role;
  institute: Institute;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const CREDENTIALS: Record<string, { password: string; role: Role; institute?: Institute }> = {
  admin:           { password: "admin@123",  role: "admin" },
  "malda-os":     { password: "os@123",     role: "os",  institute: "malda" },
  "malda-wi":     { password: "wi@123",     role: "wi",  institute: "malda" },
  "sahibganj-os": { password: "os@123",     role: "os",  institute: "sahibganj" },
  "sahibganj-wi": { password: "wi@123",     role: "wi",  institute: "sahibganj" },
  "bhagalpur-os": { password: "os@123",     role: "os",  institute: "bhagalpur" },
  "bhagalpur-wi": { password: "wi@123",     role: "wi",  institute: "bhagalpur" },
  dpo:             { password: "dpo@123",    role: "dpo" },
  "sr-dpo":       { password: "srdpo@123", role: "sr-dpo" },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem("role") as Role) || null;
  });
  const [institute, setInstitute] = useState<Institute>(() => {
    return (localStorage.getItem("institute") as Institute) || null;
  });

  const login = (username: string, password: string): boolean => {
    const entry = CREDENTIALS[username.toLowerCase()];
    if (entry && entry.password === password) {
      setRole(entry.role);
      setInstitute(entry.institute || null);
      localStorage.setItem("role", entry.role as string);
      if (entry.institute) {
        localStorage.setItem("institute", entry.institute);
      } else {
        localStorage.removeItem("institute");
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    setInstitute(null);
    localStorage.removeItem("role");
    localStorage.removeItem("institute");
  };

  return (
    <AuthContext.Provider value={{ role, institute, login, logout, isAuthenticated: role !== null }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
