import { createContext, useContext, useState } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("vetpath_token"));

  async function login(email, password) {
    const { token } = await api.post("/auth/login", { email, password });
    localStorage.setItem("vetpath_token", token);
    setToken(token);
  }

  async function signup(fields) {
    const { token } = await api.post("/auth/signup", fields);
    localStorage.setItem("vetpath_token", token);
    setToken(token);
  }

  function logout() {
    localStorage.removeItem("vetpath_token");
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook so components call useAuth() instead of importing
// AuthContext + useContext directly everywhere.
export function useAuth() {
  return useContext(AuthContext);
}
