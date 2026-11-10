import { useEffect } from "react";

// Sets the tab title; shared links also show it in browser history.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Project Exfil` : "Project Exfil";
  }, [title]);
}
