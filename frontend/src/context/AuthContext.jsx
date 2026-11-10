import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setUnauthorizedHandler } from "../lib/api.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "vetpath_token";

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked: the session just won't survive a reload
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  // The signed-in user's own account info from GET /auth/me (null while
  // loading or logged out). Used for the username prompt.
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const refreshUser = useCallback(() => {
    if (!token) return Promise.resolve();
    return api
      .get("/auth/me", token)
      .then(setUser)
      .catch(() => {}); // a 401 already logged us out via the handler
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  async function startSession(newToken) {
    writeToken(newToken);
    setToken(newToken);
  }

  async function login(email, password) {
    const { token } = await api.post("/auth/login", { email, password });
    await startSession(token);
  }

  async function signup(fields) {
    const { token } = await api.post("/auth/signup", fields);
    await startSession(token);
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook so components call useAuth() instead of importing
// AuthContext + useContext directly everywhere.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
