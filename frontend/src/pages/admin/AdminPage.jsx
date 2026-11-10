import { useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../lib/useDocumentTitle.js";
import { useAdminList } from "./useAdminApi.js";
import { ReportsTab } from "./ReportsTab.jsx";
import { SubmissionsTab } from "./SubmissionsTab.jsx";
import { UsersTab } from "./UsersTab.jsx";
import { DraftsTab } from "./DraftsTab.jsx";

const TABS = [
  { id: "reports", label: "Reports", count: "openReports", Component: ReportsTab },
  { id: "submissions", label: "Submissions", count: "pendingSubmissions", Component: SubmissionsTab },
  { id: "users", label: "Users", Component: UsersTab },
  { id: "drafts", label: "Drafts to review", count: "drafts", Component: DraftsTab },
];

// /admin?tab=… — admin-only. The server enforces this on every /admin
// request; the client check only avoids showing an empty page.
export function AdminPage() {
  useDocumentTitle("Admin");
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: counts, reload } = useAdminList("/admin/summary");

  if (!user) return <p>Loading...</p>;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;

  const active = TABS.find((t) => t.id === params.get("tab")) ?? TABS[0];
  const { Component } = active;

  return (
    <div>
      <h1>Admin</h1>
      <div className="admin-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active.id}
            className={t.id === active.id ? "admin-tab active" : "admin-tab"}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
          >
            {t.label}
            {t.count && counts && counts[t.count] > 0 && <span className="admin-count">{counts[t.count]}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <Component onChange={reload} />
      </div>
    </div>
  );
}
