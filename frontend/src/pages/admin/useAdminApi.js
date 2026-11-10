import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../lib/api.js";

// Loads an admin list and exposes reload(); errors become a message.
export function useAdminList(path) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setError(null);
    return api.get(path, token).then(setData).catch((err) => setError(err.message));
  }, [path, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}

// Runs an admin action; returns true on success, else sets the error.
export function useAdminAction() {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (path, body = {}) => {
      setBusy(true);
      setError(null);
      try {
        return (await api.post(path, body, token)) ?? true;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  return { run, busy, error };
}
