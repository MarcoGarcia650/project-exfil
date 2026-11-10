import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "./api.js";

// The set of program ids the current user has saved, plus a save() action.
// Logged out: an empty set, and save() is never offered (see SaveButton).
export function useSavedProgramIds() {
  const { token } = useAuth();
  const [savedIds, setSavedIds] = useState(new Set());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setSavedIds(new Set());
      return;
    }
    api
      .get("/saved-employers/program-ids", token)
      .then((ids) => setSavedIds(new Set(ids)))
      .catch(() => {}); // non-fatal: buttons just start as "Save"
  }, [token]);

  const save = useCallback(
    async (programId) => {
      setError(null);
      try {
        await api.post("/saved-employers", { programId }, token);
        setSavedIds((prev) => new Set(prev).add(programId));
      } catch (err) {
        // Already saved (e.g. clicked before the saved ids finished loading):
        // the end state is what the user wanted, so show it as saved.
        if (/already saved/i.test(err.message)) {
          setSavedIds((prev) => new Set(prev).add(programId));
        } else {
          setError(err.message);
        }
      }
    },
    [token]
  );

  return { savedIds, save, error };
}
